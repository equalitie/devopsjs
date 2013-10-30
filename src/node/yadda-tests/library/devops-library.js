/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
// Define the steps that can be used in devops features

var dns = require('dns');
var http = require('http');


var _ = require('lodash');
var Q = require('q');

var expect = require('chai').expect;
var Library = require('yadda').localisation.English;


var httpHelper = require('../lib/http-helpers.js');
var dnsHelper = require('../lib/dns-helpers.js');

/**
 * create a function to be used in a reduce statement
 * applies testFunction to each value
 * ANDs it with the previous value
 * @param testFunction
 * @returns {Function}
 */
var createReduceAndFunction = function (testFunction) {
  return function (previousValue, currentValue) {
    if (previousValue === undefined) {
      previousValue = true;
    }
    return previousValue && testFunction(currentValue);
  };
};

module.exports = function () {
  'use strict';
  var resolvedAddresses, aliasAddressesArr, library, responseCode,
      resolveTime, retrievedUrls, viaHeaders;

  library = new Library()

    .given('site looked up', function (next) {
      dnsHelper.resolveAddress(this.address)
        .then(function(result) {
          resolvedAddresses = result.addresses;
          resolveTime = result.resolveTime;
        })
        .done(function () {
          next();
        });
    })

    .given('performed DNS lookup', function(next) {
      dnsHelper.resolveAddress(this.address)
        .then(function(result) {
          resolvedAddresses = result.addresses;
          resolveTime = result.resolveTime;
        })
        .done(function () {
          next();
        });
    })

    .given('the no cache address was retrieved twice', function (next) {
      var hostname = this.nocacheAddress;
      var promises = [];
      promises.push(httpHelper.headers.retrieveHeaders(hostname));
      promises.push(httpHelper.headers.retrieveHeaders(hostname));
      Q.all(promises)
       .then(function (results) {
         viaHeaders = results.map(function (header) {
           return header.via;
         });
         next();
       });

    })

    .given('excluded locations retrieved', function (next) {
      retrievedUrls = this.excludeLocations;
      next();
    })

    .when('used as a proxy to make a request to $HOST', function (hostname, next) {
      var options = {
        host   : hostAddress,
        port   : 80,
        path   : hostname,
        headers: {
          Host: hostname
        }
      };
      try {
        http.get(options, function (response) {
          responseCode = response.statusCode;
          next();
        });
      }
      catch (e) {
        responseCode = -1;
        next();
      }
    })


    .then('aliases should resolve', function (next) {
      dnsHelper.resolveAliases(this.aliases, this.address)
        .then(function (resolvedAliasAddressesArr) {
          aliasAddressesArr = resolvedAliasAddressesArr;
          aliasAddressesArr.forEach(function (aliasAddresses) {
            expect(aliasAddresses).to.not.be.undefined;
          });
        })
        .done(function () {
          next();
        });
    })

    .then('it should not be cached', function(next) {
      var reductionFunction =
        createReduceAndFunction(httpHelper.headers.isNotFromCache);
      var isNotFromCache = viaHeaders.reduce(reductionFunction, true);
      next();
    })

    .then('they should match addresses', function (next) {
      var errors = [];
      aliasAddressesArr.forEach(function (aliasAddresses) {
        _.each(aliasAddresses, function (address){
          var contains = _.contains(resolvedAddresses, address);
          try {
            expect(contains).to.be.true;
          }
          catch (e) {
            errors.push('alias ' + address + ' not found in resolved addresses' +
                  ' for ' + this.siteOf + '\n');
          }
        }, this);
      }.bind(this));
      if (errors.length > 0) {
        throw errors.join();
      }
      next();
    })

    .then('it should be the Deflect logo', function(next) {
      var hostname = this.address,
          paths = retrievedUrls,
          contentKey = 'deflect';

      if (retrievedUrls.length > 0) {
        httpHelper.searchForContentInRequest(hostname, paths, contentKey)
          .then(function (results) {
            results.forEach(function (result) {
              expect(result).to.be.true;
            })
          })
          .done(function () {
            next();
          });
      }
      else {
        next();
      }

    })

    .then('it should resolve', function (next) {
      expect(resolvedAddresses).not.to.be.undefined;
      next();
    })

    .then('$PREFIXES prefixes should resolve', function (prefixes, next) {
      next();
    })

    .then('the addresses should be $ADDRESS', function (address, next) {
      var checkAddresses = function (previousValue, hostAddress) {
        return hostAddress === this.deflectServers.cname && previousValue;
      };
      var checkIpAddresses = function (previousValue, hostAddress) {
        var ipAddressFound = _.contains(this.deflectServers.ipAddresses, hostAddress);
        return ipAddressFound || previousValue;
      };
      var resolveViaCname = resolvedAddresses.reduce(checkAddresses.bind(this), true);
      var resolveViaIp    = resolvedAddresses.reduce(checkIpAddresses.bind(this), false);
      var resolved = resolveViaCname || resolveViaIp;
      expect(resolved).to.be.true;
      next();
    })

    .then('it should receive a $RESPONSENUM response',
    function (responseNum, next) {
      expect(responseCode).to.equal(200);
      next();
    })

    .then('it should return within $SECONDS seconds',
    function (seconds, next) {
      expect(resolveTime).to.be.below(seconds);
      next();
    })

    .then('it should include the word $WORD', function (word, next) {
      next();
    });

  return library;
}();

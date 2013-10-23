/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
// Define the steps that can be used in devops features

var dns = require('dns');
var http = require('http');


var _ = require('lodash');

var expect = require('expect.js');
var Library = require('yadda').localisation.English;

var Q = require('q');

var httpHelper = require('../lib/http-helpers.js');

/**
 * create a function to be used in a reduce statement
 * accepts a testFunction that will be applied to each value
 * @param testFunction
 * @returns {Function}
 */
var createReduceAndFunction = function (testFunction) {
  return function (previousValue, currentValue) {
    return previousValue && testFunction(currentValue);
  };
};

module.exports = function () {
  'use strict';
  var resolvedAddresses, aliasAddresses, library, responseCode, then,
      now, retrievedUrls, viaHeaders;

  library = new Library()

    .given('site looked up', function (next) {
      var hostname = this.siteOf;
      then = parseInt((Date.now() / 1000), 10);
      dns.resolve(hostname, function (err, addresses) {
        now = parseInt((Date.now() / 1000), 10);
        resolvedAddresses = addresses;
        next();
      });
    })

    .given('performed DNS lookup', function(next) {
      if (resolvedAddresses.length < 1) {
        throw Exception('didn\'t resolve intially');
      }
      next();
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
      var sites = this.aliases.map(function(alias) {
        return alias + this.siteOf;
      });
      dns.resolve(site, function (err, addresses) {
        expect(addresses).not.to.be(undefined);
        aliasAddresses = addresses;
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
      _.each(aliasAddresses, function (address){
        var contains = _.contains(resolvedAddresses, address);
        expect(contains).to.be(true);
      });
      next();
    })

    .then('it should be the Deflect logo', function(next) {
      var hostname = this.siteOf,
          paths = retrievedUrls,
          contentKey = 'deflect';

      httpHelper.searchForContentInRequest(hostname, paths, contentKey)
        .then(function (results) {
          results.forEach(function (result) {
            expect(result).to.be(true);
          })
        })
        .done(function () {
          next();
        });

    })


    .then('it should resolve', function (next) {
      expect(resolvedAddresses).not.to.be(undefined);
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
      expect(resolved).to.be(true);
      next();
    })

    .then('it should receive a $RESPONSENUM response',
    function (responseNum, next) {
      expect(responseCode).to.be(200);
      next();

    })

    .then('it should return within $SECONDS seconds',
    function (seconds, next) {
      expect(now - then).to.be.lessThan(seconds);
      next();
    })

    .then('it should include the word $WORD', function (word, next) {
      next();
    });

  return library;
}();
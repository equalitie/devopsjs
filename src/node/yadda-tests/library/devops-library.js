/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
// Define the steps that can be used in devops features
// use assert style assertions to show fail messages
// uses http and dns helpers from the lib folder to do the heavy lifting

var dns = require('dns');
var http = require('http');


var _ = require('lodash');
var Q = require('q');

var expect = require('chai').expect;
var assert = require('chai').assert;
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

module.exports = (function () {
  'use strict';
  var resolvedAddresses, aliasAddressesArr, library, responseCode,
      resolveTime, retrievedUrls, viaHeaders, path;

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

    .given('retrieved page $PATH', function(urlPath, next) {
      if (urlPath === '@validatePage@') {
        urlPath = '';
      }
      path = urlPath;
      next();
    })

    .given('excluded locations retrieved', function (next) {
      retrievedUrls = this.excludeLocations;
      next();
    })

    .then('aliases should resolve', function (next) {
      dnsHelper.resolveAliases(this.aliases, this.address)
        .then(function (resolvedAliasAddressesArr) {
          aliasAddressesArr = resolvedAliasAddressesArr;
          aliasAddressesArr.forEach(function (aliasAddresses) {
            assert.notEqual(aliasAddresses, undefined);
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
          var errorMessage = 'alias address: ' + address + ' not found in resolved addresses, ' +
          resolvedAddresses + ' for ' + this.siteOf + '\n';
          var contains = _.contains(resolvedAddresses, address);
          assert.equal(true, contains, errorMessage); 
        }, this);
      }.bind(this));
      next();
    })

    .then('it should be the Deflect logo', function(next) {
      var hostname = this.address,
          paths = retrievedUrls,
          contentKey = 'deflect';

      if (retrievedUrls.length > 0) {
        httpHelper.checkIfImageReturned(hostname, paths, contentKey)
          .then(function (results) {
            results.forEach(function (result) {
              var failString = result.path + ' is not returning the deflect logo\n';
              assert.equal(true, result.found, failString);
            });
          })
          .done(function () {
            next();
          });
      }
      else {
        next();
      }

    })
    .then('it should contain $TERM', function(term, next) {
      httpHelper.searchForContentInRequest(this.address, path, term)
        .then(function(matchFound) {
          var errorMessage = 'Term: "' + term + '" not found in the page at ' +
            this.address + this.path;
          assert.equal(true, matchFound, errorMessage);
        })
        .done(function() {
          next();
        });

    })

    .then('it should resolve', function (next) {
      var errorMessage = this.siteOf + ' did not resolve\n';
      assert.notEqual(resolvedAddresses, undefined, errorMessage);
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
      assert.equal(200, responseCode, 'response code does not match');
      next();
    })

    .then('it should return within $SECONDS seconds',
    function (seconds, next) {
      expect(resolveTime).to.be.below(seconds);
      next();
    });

  return library;
}());

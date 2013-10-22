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

module.exports = function () {
  'use strict';
  var resolvedAddresses, aliasAddresses, library, responseCode, then, now, retrievedUrls;

  library = new Library()

    .given('$HOST looked up', function (hostname, next) {
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

    .when('retrieving $urls', function (urls, next) {
      if (_.contains(urls, ',')) {
        retrievedUrls = urls.split(',');
      }
      else retrievedUrls = [urls];
      next();
    })

    .then('$subdomain should resolve', function (subdomain, next) {
      var site  = subdomain + this.siteOf;
      dns.resolve(site, function (err, addresses) {
        expect(addresses).not.to.be(undefined);
        aliasAddresses = addresses;
        next();
      });
    })

    .then('retrieving it again', function(next) {
      next();
    })

    .then('it should not be cached', function(next) {
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
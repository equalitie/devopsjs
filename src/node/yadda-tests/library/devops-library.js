/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
// Define the steps that can be used in devops features

var expect = require('expect.js');
var Library = require('yadda').localisation.English;

var dns = require('dns');
var http = require('http');
var Q = require('q');

module.exports = function () {
  'use strict';
  var resolvedAddresses, library, responseCode, then, now;

  library = new Library()

    .given('$HOST looked up', function (hostname, next) {
      then = parseInt((Date.now() / 1000), 10);
      dns.resolveCname(hostname, function (err, addresses) {
        now = parseInt((Date.now() / 1000), 10);
        resolvedAddresses = addresses;
        next();

      });
    })
    .when('used as a proxy to make a request to $HOST', function (hostname, next) {
      var options = {
        host   : hostAddress,
        port   : 80,
        path   : 'http://' + hostname,
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

    .then('the address should resolve', function (next) {
      expect(resolvedAddresses).not.to.be(undefined);
      next();
    })

    .then('$PREFIXES prefixes should resolve', function (prefixes, next) {
      next();
    })

    .then('the addresses should be $ADDRESS', function (address, next) {
      var deflectServer = this.deflectServers[address];
      var checkAddresses = function (previousValue, hostAddress) {
        return hostAddress === deflectServer;
      };
      expect(resolvedAddresses.reduce(checkAddresses, true))
        .to.be(true);
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
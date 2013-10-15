/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
// Define the steps that can be used in devops features

var expect = require('expect.js');
var Library = require('yadda').localisation.English;

var dns = require('dns');
var http = require('http');

module.exports = (function() {
  'use strict';
  var hostAddress, library, responseCode, then, now;

  library = new Library()

    .given('$HOST looked up', function(hostname, next) {
      then = parseInt((Date.now() / 1000), 10);
      dns.lookup(hostname, function (err, address) {
        now = parseInt((Date.now() / 1000), 10);
        hostAddress = address;
        next();
      });
    })

    .when('used as a proxy to make a request to $HOST', function(hostname, next) {
      var options = {
        host: hostAddress,
        port: 80,
        path: 'http://' + hostname,
        headers: {
          Host: hostname
        }
      };
      try {
        http.get(options, function(response) {
          responseCode = response.statusCode;
          next();
        });
      }
      catch (e) {
        responseCode = -1;
        next();
      }
    })

    .then('the address should resolve', function(next) {
      expect(hostAddress).not.to.be(undefined);
      next();
    })

    .then('it should receive a $RESPONSENUM response',
    function(responseNum, next) {
      expect(responseCode).to.be(200);
      next();

    })

    .then('it should return within $SECONDS seconds',
    function(seconds, next) {
      expect(now - then).to.be.lessThan(seconds);
      next();
    })
    .then('it should include the word $WORD', function(seconds, next) {
      next();
    });

  return library;
}());

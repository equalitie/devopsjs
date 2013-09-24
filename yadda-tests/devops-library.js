/*global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description:
//


var expect = require('expect.js');
var Library = require('yadda').localisation.English;

var dns = require('dns');
var http = require('http');

module.exports = (function() {
  'use strict';
  var hostAddress, library, responseCode;

  library = new Library()
    .given('$HOST looked up', function(hostname, next) {
      dns.lookup(hostname, function (err, address) {
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
      console.log(hostAddress);
      expect(hostAddress).not.to.be(undefined);
      next();
    })
    .then('it should receive a $RESPONSENUM response', function(responseNum, next) {
      expect(responseCode).to.be(200);
      next();

    });

  return library;
}());

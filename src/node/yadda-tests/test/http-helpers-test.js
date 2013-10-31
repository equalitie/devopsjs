/* global require, module, setTimeout*/
/* jshint node:true */
// Author: Cormac McGuire
// ### Description
// test the http helper library

var fs = require('fs');

var expect = require('chai').expect;
var request = require('request');
var sinon = require('sinon');
var httpHelper = require('../lib/http-helpers.js');


var mocks = require('./mocks/response.js');
var mockDir =  require("path").resolve(__dirname) + '/mocks/';

describe('Test http helper functions', function () {
  it('should find the deflect logo for equalit.ie/user', function (done) {
    var hostname   = 'testing.hostname',
        path       = ['/user'],
        contentKey = 'deflect';

    var emitter,
        listener = function() {};

    fs.readFile(mockDir + 'user.png', function(err, fileData) {

      var mock = stubRequestGet({
        body: fileData,
        headers: {
          "content-type": 'image/png'
        }
      });


      httpHelper.checkIfImageReturned(hostname, path, contentKey)
        .then(function (results) {
          results.forEach(function(result){
            expect(result.found).to.be.true;
          });
        })
        .done(function(){
          mock.restore();
          done();
        });
    });

  });

  it('should retrieve headers', function(done) {
    var mock = stubRequestGet(mocks.response);
    var hostname = 'test.host';
    httpHelper.headers.retrieveHeaders(hostname)
      .then(function (header) {
        expect(header).not.to.be.undefined;
      })
      .done(function () {
        done();
      });
    mock.restore();
  });

  it('should check a header to see if it came from the cache', function() {
    var isNotFromCache = httpHelper.headers.isNotFromCache(notCachedHeader());
        isFromCache = httpHelper.headers.isFromCache(cachedHeader());
    expect(isNotFromCache).to.be.true;
    expect(isFromCache).to.be.true;
  });

  it('should check a response for an expected term', function(done){
    var mock     = stubRequestGet(mocks.response),
        hostname = 'test.host',
        path     = '/testing',
        content  = 'test phrase';
    
    httpHelper.searchForContentInRequest(hostname, path, content)
      .then(function (matchFound) {
        expect(matchFound).to.be.true;
      })
      .done(function () {
        done();
      });
    mock.restore();
  });

});

var stubRequestGet = function(mockResponse) {
   return sinon.stub(request, 'get').yields(null, mockResponse);
};

var notCachedHeader = function() {
  return 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScMsSf pSeN:t cCMi p sS])';
};

var cachedHeader = function() {
  return 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScHsSf pSeN:t cCMi p sS])';
};

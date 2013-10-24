/* global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description
// test the http helper library

var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

var expect = require('chai').expect;
var request = require('request');
var sinon = require('sinon');
var httpHelper = require('../lib/http-helpers.js');


var mocks = require('./mocks/request.js');
var mockDir =  require("path").resolve(__dirname) + '/mocks/';

describe('Test http helper functions', function () {
  it('should find the deflect logo for equalit.ie/user', function (done) {
    var hostname   = 'testing.hostname',
        path       = ['/user'],
        contentKey = 'deflect';

    var emitter,
        listener = function() {},
        mock;

    emitter  = new EventEmitter();
    mock = sinon.stub(request, 'get')
                .yields(null, emitter);

    fs.readFile(mockDir + 'user.png', function(err, fileData) {
      emitter.emit('data', fileData);
      emitter.emit('end');
    });

    httpHelper.searchForContentInRequest(hostname, path, contentKey)
      .then(function (results) {
        results.forEach(function(result){
          expect(result).to.be.true;
        })
      })
      .done(function(){
        mock.restore();
        done();
      });
  });
  it('should retrieve headers', function(done) {
    var mock =
      sinon.stub(request, 'get')
      .yields(null, mocks.request);
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
    var viaHeader   = 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScMsSf pSeN:t cCMi p sS])',
        isNotFromCache = httpHelper.headers.isNotFromCache(viaHeader);
    expect(isNotFromCache).to.be.true;
    viaHeader   = 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScHsSf pSeN:t cCMi p sS])',
    isFromCache = httpHelper.headers.isFromCache(viaHeader);
    expect(isFromCache).to.be.true;
  });

});

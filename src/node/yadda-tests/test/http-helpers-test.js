/* global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description
// test the http helper library

var expect = require('expect.js');
var httpHelper = require('../lib/http-helpers.js');


describe('Test http helper functions', function () {
  it('should find the deflect logo for equalit.ie/user', function (done) {
    var hostname   = 'equalit.ie',
        path       = ['/user'],
        contentKey = 'deflect';

    httpHelper.searchForContentInRequest(hostname, path, contentKey)
      .then(function (results) {
        results.forEach(function(result){
          expect(result).to.be(true);
        })
      })
      .done(function(){
        done();
      });
  });
  it('should retrieve headers', function(done) {
    var hostname   = 'noun.equalit.ie';
    httpHelper.headers.retrieveHeaders(hostname)
      .then(function (header) {
        expect(header).not.to.be(undefined);
      })
      .done(function () {
        done();
      });
  });


  it('should check a header to see if it came from the cache', function() {
    var viaHeader   = 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScMsSf pSeN:t cCMi p sS])',
        isNotFromCache = httpHelper.headers.isNotFromCache(viaHeader);
    expect(isNotFromCache).to.be(true);
    viaHeader   = 'http/1.1 hetzner8.deflect.ca (ApacheTrafficServer/3.2.5 [uScHsSf pSeN:t cCMi p sS])',
    isFromCache = httpHelper.headers.isFromCache(viaHeader);
    expect(isFromCache).to.be(true);
  });

});

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
        });
        done();
      });
  });

});
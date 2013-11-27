#!/usr/bin/env node

(function() {
  var nom = require('../src/node/lib/nomination.js');
  var expect = require('chai').expect;

  var testConfig = require('../config/testConfig.js');
  var cached;

  describe("nomination tests", function() {
    before(function(done){
      nom.resolve(['hetzner7.deflect.ca', 'chime1.deflect.ca'], ['edge.deflect.ca', 'staging.deflect.ca'], function(r) {
        cached = r;
        done();
      });
    });

    xit("resolves", function testGetWiki(done) {
      expect(nom.getConfig('hetzner7.deflect.ca')).to.not.equal(null);
      done();
    });
  });
})();


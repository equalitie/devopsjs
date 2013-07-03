#!/usr/bin/env node

var nom = require('../src/node/lib/nomination.js');
var expect = require('chai').expect;

var testConfig = require('../config/testConfig.js');
var cached;

suite("nomination tests", function() {
  setup(function(done){
    nom.resolve(['hetzner7.deflect.ca', 'chime1.deflect.ca'], ['edge.deflect.ca', 'staging.deflect.ca'], function(r) {
      cached = r;
      done();
    });
  });

  test("resolve", function testGetWiki(done) {
    expect(nom.getConfig('hetzner7.deflect.ca')).to.be.notnull;
    done();
  });
});


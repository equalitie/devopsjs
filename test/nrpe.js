#!/usr/bin/env node

var check = require('../src/node/lib/nrpe/check.js');
var timekeeper = require('timekeeper');
var expect = require('chai').expect;

var testConfig = require('../config/testConfig.js');

suite("nomination tests", function() {
  test("filter check", function testFilterCheck() {
    var nrpeChecks = require('../src/node/lib/nrpe/allchecks.js').getChecks('check_fail2ban');
    expect(nrpeChecks['failb2an']).to.be.notnull;
    expect(Object.keys(nrpeChecks).length == 1).to.be.true;
  });
});


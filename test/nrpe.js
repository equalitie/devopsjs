#!/usr/bin/env node

(function() {
  var check = require('../src/node/lib/nrpe/check.js');
  var timekeeper = require('timekeeper');
  var expect = require('chai').expect;

  var testConfig = require('../config/testConfig.js');

  describe("nomination tests", function() {
    it("filters check", function testFilterCheck() {
      var nrpeChecks = require('../src/node/lib/nrpe/allchecks.js').getChecks('check_fail2ban');
      expect(nrpeChecks.failb2an).to.not.equal(null);
      expect(Object.keys(nrpeChecks).length == 1).to.equal(true);
    });
  });
})();

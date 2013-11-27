#!/usr/bin/env node

(function() {
  var utils = require('../src/node/lib/util.js');
  utils.config();

  var semwiki = require('../src/node/lib/semwiki.js');

  var expect = require('chai').expect;

  var testConfig = require('../config/testConfig.js');

  describe("semwiki tests", function() {
  before(function(done){
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, function() {
      done();
    });
    
    it("getWiki", function testGetWiki(done) {
        expect(semwiki.loggedIn).to.equal(true);
      });
    });
    it("getUsers", function testGetWiki(done) {
      semwiki.getUsers(function(results) {
        expect(results['User:Bot']).to.not.equal(null);
        done();
      });
    });
    it("getActivities", function testGetWiki(done) {
      semwiki.getActivities('[[Assigned to::User:Bot]]', function(results) {
        expect(results['Activity:Be a test bot'] > 0).to.not.equal(null);
        done();
      });
    });
    /*
    it("val", function testVal() {
      var activity = {"status":["Validate"],"assignedTo":["User:RodneyM","User:DavidM"],"validator":["User:DavidM"],"contact":["User:DavidM"],"dateRequired":[],"lastUpdate":["1364601600"],"importance":["0-Low"],"modificationDate":["1364661874"],"name":"Activities:Research/System management","link":"https://wiki.equalit.ie/wiki/Activities:Research/System_management"};
    expect(semwiki.val(activity, 'Modification date')).to.not.equal(null);
    });
    */

  });
})();

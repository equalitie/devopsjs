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
    it("getTickets", function testGetWiki(done) {
      semwiki.getTickets('[[Assigned to::User:Bot]]', function(results) {
        expect(results['Ticket:Be a test bot'] > 0).to.not.equal(null);
        done();
      });
    });
    it("val", function testVal() {
      var ticket = {"status":["Validate"],"assignedTo":["User:RodneyM","User:DavidM"],"validator":["User:DavidM"],"contact":["User:DavidM"],"dateRequired":[],"lastUpdate":["1364601600"],"importance":["0-Low"],"modificationDate":["1364661874"],"name":"Ticket:Research/System management","link":"https://wiki.equalit.ie/wiki/Ticket:Research/System_management"};
    expect(semwiki.val(ticket, 'Modification date')).to.not.equal(null);
    });

  });
})();

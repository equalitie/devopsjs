#!/usr/bin/env node

var semwiki = require('../src/node/lib/semwiki.js');

var expect = require('chai').expect;

var testConfig = require('../config/testConfig.js');

suite("semwiki tests", function() {
setup(function(done){
  semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, function() {
    done();
  });
	
	test("getWiki", function testGetWiki(done) {
      expect(semwiki.loggedIn).to.be.true;
    });
	});
	test("getUsers", function testGetWiki(done) {
    semwiki.getUsers(function(results) {
      expect(results['User:Bot']).to.be.notnull;
      done();
    });
	});
	test("getTickets", function testGetWiki(done) {
    semwiki.getTickets('[[Assigned to::User:Bot]]', function(results) {
      expect(results['Ticket:Be a test bot'] > 0).to.be.notnull;
      done();
    });
	});
  test("val", function testVal() {
    var ticket = {"status":["Validate"],"assignedTo":["User:Rodney Mosley","User:DavidM"],"validator":["User:DavidM"],"contact":["User:DavidM"],"dateRequired":[],"lastUpdate":["1364601600"],"importance":["0-Low"],"modificationDate":["1364661874"],"name":"Ticket:Research/System management","link":"https://wiki.equalit.ie/wiki/Ticket:Research/System_management"}
  expect(semwiki.val(ticket, 'Modification date')).to.be.notnull;
  });

});

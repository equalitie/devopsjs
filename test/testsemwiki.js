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
    var ticket = {"printouts":{"Assigned to":[{"fulltext":"User:Bot","fullurl":"https://wiki.equalit.ie/wiki/User:Bot"}],"Contact":[{"fulltext":"User:DavidM","fullurl":"https://wiki.equalit.ie/wiki/User:DavidM"}],"Date created":["1372032000"],"Description":["Ticket for testing bot."],"Ticket for":[],"Importance":["0-Low"],"Project":[{"fulltext":"Automation","fullurl":"https://wiki.equalit.ie/wiki/Automation"}],"Ticket status":["Created"],"Validator":[{"fulltext":"User:DavidM","fullurl":"https://wiki.equalit.ie/wiki/User:DavidM"}],"Modification date":["1372086131"]},"fulltext":"Ticket:Be a test bot","fullurl":"https://wiki.equalit.ie/wiki/Ticket:Be_a_test_bot"}
  expect(semwiki.val(ticket, 'Modification date')).to.be.notnull;
  });

});

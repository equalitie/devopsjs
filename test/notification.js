#!/usr/bin/env node

var expect = require('chai').expect;

var testConfig = require('../config/testConfig.js');
var notify = require('../src/node/lib/notify.js');

/**
* A hash of status types and results expected for each.
**/

var expectedMap = { Created : { 'User:BotU': 1, 'User:BotV': 1}
  , Update : {'User:BotU' : 1, 'User:BotV' : 1}
  , Validate : {'User:BotV' : 1, 'User:BotU' : 1}
  , Completed : { 'User:BotV' : 1, 'User:BotU' : 1}
  , Cancelled : {'User:BotU' : 1, 'User:BotV' : 1}
  , 'Re-Opened' : { 'User:BotU' : 1, 'User:BotV' : 1}
  , Postponed : { 'User:BotU' : 1, 'User:BotV' : 1}};

var baseTicket = require('./mock/ticket.json');
var baseUser = require('./mock/users.json');
var notifier;

/**
* Mock tickets and users. Create one ticket with each status type, one user for each status type.
*/

var testUsers = {};
var testTickets = {};
(function(){ 
  
  for (var status in expectedMap) {
    var o = JSON.parse(JSON.stringify(baseTicket).replace(/BaseStatus/g, status).replace(/BaseTicket/g, status + 'Ticket')); // cheap clone+hack
    testTickets[status] = o;
  }
  for (var status in expectedMap) { // actually just borrowing status here
    var n = 'User:Bot' + status.substring(0, 1);
    var u = JSON.parse(JSON.stringify(baseUser).replace(/BaseBot/g, n));
    testUsers[n] = u;
  }
}());

/**
*
* As DRY as I can get. Test each status
*
*/

function doTest(status) {
  var notifier = notify.getNotifier(testUsers);
  notifier.addNotify(testTickets[status]);
  var notifications = notify.composeNotifications(notifier)
  var expected = expectedMap[status]; 
  for (var key in expected) {
    expect(notifications[key]).to.not.be.undefined;
  }
  for (var key in notifications) {
    expect(expected[key]).to.not.be.undefined;
  }
}

suite("notify tests", function() {

  test('Created status', function() {
    doTest ('Created');
  });
  test('Update status', function() {
    doTest ('Update');
  });
  test('Validate status', function() {
    doTest ('Validate');
  });
  test('Completed status', function() {
    doTest ('Completed');
  });
  test('Cancelled status', function() {
    doTest ('Cancelled');
  });
  test('Postponed status', function() {
    doTest ('Postponed');
  });
  test('Re-Opened status', function() {
    doTest ('Re-Opened');
  });
});


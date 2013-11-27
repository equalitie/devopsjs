#!/usr/bin/env node

(function() {
  var expect = require('chai').expect;

  var testConfig = require('../config/testConfig.js');
  var notify = require('../src/node/lib/notify.js');

  /**
  * A hash of status types and results expected for each.
  **/

  var expectedMap = {
    Created : {
      'User:BotU': 1,
      'User:BotV': 1
    },
    Update : {
      'User:BotU': 1,
      'User:BotV': 1
    },
    Validate : {
      'User:BotV': 1,
      'User:BotU': 1
    },
    Completed : {
      'User:BotV': 1,
      'User:BotU': 1
    },
    Cancelled : {
      'User:BotU': 1,
      'User:BotV': 1
    },
    'Re-Opened': {
      'User:BotU': 1,
      'User:BotV' : 1
    },
    Postponed: {
      'User:BotU' : 1,
      'User:BotV' : 1
    }
  };
  var baseTicket = require('./mock/ticket.json');
  var baseUser = require('./mock/users.json');
  var notifier;

  /**
  * Mock tickets and users. Create one ticket with each status type, one user for each status type.
  */

  var testUsers = {};
  var testTickets = {};
  (function(){ 
    
    var status;
    for (status in expectedMap) {
      var o = JSON.parse(JSON.stringify(baseTicket).replace(/BaseStatus/g, status).replace(/BaseTicket/g, status + 'Ticket')); // cheap clone+hack
      testTickets[status] = o;
    }
    for (status in expectedMap) { // actually just borrowing status here
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
    var key, notifier = notify.getNotifier(testUsers);
    notifier.addCandidate(testTickets[status]);
    var notifications = notify.composeNotifications(notifier);
    var expected = expectedMap[status]; 

    for (key in expected) {
      expect(notifications[key]).to.not.equal(undefined);
    }
    for (key in notifications) {
      expect(expected[key]).to.not.equal(undefined);
    }
  }

  xdescribe("notify tests", function() {

    it('Created status', function() {
      doTest ('Created');
    });
    it('Update status', function() {
      doTest ('Update');
    });
    it('Validate status', function() {
      doTest ('Validate');
    });
    it('Completed status', function() {
      doTest ('Completed');
    });
    it('Cancelled status', function() {
      doTest ('Cancelled');
    });
    it('Postponed status', function() {
      doTest ('Postponed');
    });
    it('Re-Opened status', function() {
      doTest ('Re-Opened');
    });
  });
})();

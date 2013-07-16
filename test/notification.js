#!/usr/bin/env node

var expect = require('chai').expect;

var testConfig = require('../config/testConfig.js');
var notify = require('../src/node/lib/notify.js');
var ticketTypes = ['Update', 'Validate', 'Completed', 'Cancelled', 'Re-Opened', 'Postponed'];

var baseTicket = require('./mock/ticket.json');
var baseUser = require('./mock/users.json');
var notifier;

(function(){ // mocks of users and tickets
  var users = [];
  notifier = notify.getNotifier();
  var tickets = [];
  ticketTypes.forEach(function(status) { // actually just borrowing status here
    var u = JSON.parse(JSON.stringify(baseUser).replace(/Base.bot/, 'Bot ' + status.substring(0, 1))); // cheap clone/hack
    users.push(u);
  });
  notifier.allUsers = users;
  ticketTypes.forEach(function(status, i) {
    var o = JSON.parse(JSON.stringify(baseTicket)); // cheap clone
    o.status = status;
    o.name = 'Ticket:'+status;
    o.link = 'http://testwiki/wiki/Ticket:'+status;
    notifier.addNotify(o);
    tickets.push(o);

  });
}());


suite("notify tests", function() {
  setup(function(done){
    done();
  });

  test("verify number of results", function (done) {
    var n = notify.composeNotifications(notifier);
console.log(JSON.stringify(n, null, 2));
    done();
  });

  test("just get one page", function(done) {
    done();
  });
});


var semwiki = require('./lib/semwiki.js');
var queue = require('queue-async');

var doSend = true;
if (!doSend) {
  var nomo = require('node-monkey').start();
}
var configBase;
if (process.env.DEVOPSCONFIG) {
  configBase = process.env.DEVOPSCONFIG;
} else {
  configBase = process.cwd() + '/config/';
}

var toSend = []; // buffered messages
var allUsers; // cached users

try {
  require(configBase + 'localConfig.js');
} catch (e) {
  throw 'Could not require "' + configBase + '/localConfig.js" — define DEVOPSCONFIG or run this program from its parent directory.';
}

var emailFrom = GLOBAL.CONFIG.notify.emailFrom;
var emailSubject = GLOBAL.CONFIG.notify.emailSubject;

allTickets();

function allTickets() {
  var getWikiQueue = queue();
  getWikiQueue.defer(function(callback) {
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, callback);
  });
  getWikiQueue.awaitAll(function(err) {
    var getTicketsQueue = queue();

    getTicketsQueue.defer(function(callback) {
      semwiki.getUsers(function(users) {
        allUsers = users;
        callback();
      });
    });
    getTicketsQueue.defer(function(callback) {
      semwiki.getTickets('[[Category:Unresolved tickets]]', function(tickets) {
        for (var ticket in tickets) {
          addNotify(tickets[ticket]);
        }
        callback();
      });
    });
    getTicketsQueue.awaitAll(function(err) {
      sendMail();
    });
  });
}

function addNotify(ticket) {
  var jt = {
    status : semwiki.val(ticket, 'Ticket status'),
    assignedTo : semwiki.val(ticket, 'Assigned to'),
    validator : semwiki.val(ticket, 'Validator'),
    contact : semwiki.val(ticket, 'Contact'),
    dateRequired : semwiki.date(ticket, 'Date required'),
    lastUpdate : semwiki.date(ticket, 'Last update'),
    importance : semwiki.val(ticket, 'Importance'),
    modificationDate : semwiki.date(ticket, 'Modification date'),
    name : ticket.fulltext,
    link : ticket.fullurl,
    tags: []
  }
  if (jt.dateRequired[0] && jt.dateRequired[0].getTime() < new Date().getTime()) {
    jt.tags.push('OVERDUE');
  }

  jt.assignedTo.forEach(function (u) {
    var user = getUser(u);
    if (user) {
      semwiki.val(user, 'Current activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Current'); });
      semwiki.val(user, 'Planned activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Planned'); });
    } else {
      console.error("Missing user " + u);
    }
  });

  toSend.push(jt);
}

function sendMail() {
  var action = {};
  var cc = {};
  var actionTitle = '<h2>Action items</h2><br />\n';
  var ccTitle = '<br />\n<h2>Watching items</h2><br />\n';

  toSend.forEach(function(jt) { // first break out if it's an action item or watching item
    var message = '<a href="' + jt.link + '">'+jt.name.replace(/^Ticket:/, '') + '</a> <b>' + jt.importance + '</b> ' + (jt.tags.length > 0 ? '['+jt.tags+']' : ''); 
    if (jt.status == 'Validate') {
      jt.validator.forEach(function (v) {
        action[v] = (action[v] || actionTitle) + '* <span style="font-style:italic; color: green">Validate</span> ' + message + '<br />\n';
      });
      jt.assignedTo.forEach(function(a) {
       cc[a] = (cc[a] || ccTitle) + '* <i>Needs validation from ' + jt.validator.toString().replace(/User:/, '') + '</i> ' + message + '<br />\n';
      });
    } else {
      jt.assignedTo.forEach(function (a) {
        action[a] = (action[a] || actionTitle) + '* <span style="font-style:italic; color: green">Update</span> ' + message + '<br />\n';
      });
    }
  });
  var m = {}; // then create grouped message texts in appropriate order
  for (var v in action) {
    m[v] = (m[v] || '') + action[v];
  }
  for (var v in cc) {
    m[v] = (m[v] || '') + cc[v];
  }
  var nodemailer = require("nodemailer");

  var transport = GLOBAL.CONFIG.notify.mailTransport;

  for (var u in m) {
    var addy = null, user = getUser(u);
    if (user) {
      addy = semwiki.val(user, 'Contact address')[0];
    }
//    console.log('\n\n***', u, addy, JSON.stringify(m[u]));
    if (addy) {
      var mailOptions = {
          from: emailFrom,
          to: u.replace(/^User:/, '') + ' <' + addy + '>',
          subject: emailSubject,
          text: m[u].replace(/<.*?>/g, ''),
          html: m[u]
      }

      if (doSend) {
        transport.sendMail(mailOptions, function(error, response) {
          if (error){
            console.error(error);
          }
        });
      }
    } else {
      console.error('missing Contact address for ' + u);
    }
  }
  transport.close(); 
}

function getUser(u) {
  if (u.indexOf('User:')< 0) {
    u = 'User:'+u;
  }
  return allUsers[u];
}


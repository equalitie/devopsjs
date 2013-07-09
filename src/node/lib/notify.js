var semwiki = require('./semwiki.js');
var queue = require('queue-async');

var toSend = []; // buffered messages
var allUsers; // cached users

var emailFrom = GLOBAL.CONFIG.notify.emailFrom;
var emailSubject = GLOBAL.CONFIG.notify.emailSubject;

exports.processTickets =function(ticketQuery) {
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
      semwiki.getTickets(ticketQuery, function(tickets) {
        for (var ticket in tickets) {
          addNotify(tickets[ticket]);
        }
        callback();
      });
    });
    getTicketsQueue.awaitAll(function(err) {
      
      sendNotifications(addressNotifications());
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
    lastProvider : semwiki.val(ticket, 'Last provider'),
    lastComment : semwiki.val(ticket, 'Last comment'),
    importance : semwiki.val(ticket, 'Importance'),
    modificationDate : semwiki.date(ticket, 'Modification date'),
    name : ticket.fulltext,
    link : ticket.fullurl,
    tags: []
  }
console.log(jt, 'TICKET', ticket);
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

function addressNotifications() {
  var action = {}, cc = {}, actionTitle = '<h2>Action items</h2><br />\n', ccTitle = '<br />\n<h2>Watching items</h2><br />\n';

  toSend.forEach(function(jt) { // first break out if it's an action item or watching item and assign it to appropriate section
    var message = '<a href="' + jt.link + '">'+jt.name.replace(/^Ticket:/, '') + '</a> <b>' + jt.importance + '</b> ' + (jt.tags.length > 0 ? '['+jt.tags+']' : ''); 
    message = message + ' ' + jt.lastUpdate + ' by ' + jt.lastProvider + (jt.lastComment ? '; ' + jt.lastComment : '');
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
  for (var user in action) {
    m[user] = (m[user] || '') + action[user];
  }
  for (var user in cc) {
    m[user] = (m[user] || '') + cc[user];
  }
  return m;
}

function sendNotifications(notifications) {

  var transport = GLOBAL.CONFIG.notify.notifyTransport;

  for (var u in notifications) {
    var addy = null, user = getUser(u);
    if (user) {
      addy = semwiki.val(user, 'Contact address')[0];
    }
//    console.log('\n\n***', u, addy, JSON.stringify(m[u]));
    var note = notifications[u];
    if (addy) {
      var messageOptions = {
          from: emailFrom,
          to: u.replace(/^User:/, '') + ' <' + addy + '>',
          subject: emailSubject,
          text: note.replace(/<.*?>/g, ''),
          html: note
      }

      if (!GLOBAL.CONFIG.DEBUG) {
        transport.sendNotification(messageOptions, function(error, response) {
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


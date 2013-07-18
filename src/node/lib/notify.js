var semwiki = require('./semwiki.js');
var queue = require('queue-async');

/**
* Notification lib
* currently built around semwiki
* Transport is configurable
*/

var emailFrom = GLOBAL.CONFIG.notify.emailFrom;
var emailSubject = GLOBAL.CONFIG.notify.emailSubject;

/**
*
*  Get current tickets and users from wiki according to query, then process them
*
**/

exports.processTickets = function(pageQuery, callback) {
  var getWikiQueue = queue();
  getWikiQueue.defer(function(callback) {
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, callback);
  });
  getWikiQueue.awaitAll(function(err) {
    var getTicketsQueue = queue();

    if (!notifier.allUsers) {
      getTicketsQueue.defer(function(callback) {
        semwiki.getUsers(function(users) {
          notifier.allUsers = users;
          callback();
        });
      });
    }
    getTicketsQueue.defer(function(callback) {
      semwiki.getTickets(pageQuery, function(tickets) {
        for (var ticket in tickets) {
          notifier.addNotify(tickets[ticket]);
        }
        callback();
      });
    });
    getTicketsQueue.awaitAll(function(err) {
      callback(err, notifier);
    });
  });
}

/** 
* get notifier with these users
**/

exports.getNotifier = function(users) {
  notifier.reset();
  notifier.allUsers = users;
  return notifier;
}


/**
* 
* Create the notifications based on data
*/

exports.composeNotifications = function(notifier) {
  var action = {}, cc = {}, actionTitle = '<h2>Action items</h2><br />\n', ccTitle = '<br />\n<h2>Watching items</h2><br />\n';

  notifier.toSend.forEach(function(jt) { // first break out if it's an action item or watching item and assign it to appropriate section
    var message = '<a href="' + jt.link + '">'+jt.name.replace(/^Ticket:/, '') + '</a> <b>' + jt.importance + '</b> ' + (jt.tags.length > 0 ? '['+jt.tags+']' : ''); 
    message = message + ' ' + jt.lastUpdate + ' by ' + jt.lastProvider + (jt.lastComment ? '; ' + jt.lastComment : '');
/**
* Action item for validator, notify for updater
*/ 
    if (jt.status == 'Validate') {
      var seen = {};
      jt.validator.forEach(function (v) {
        action[v] = (action[v] || actionTitle) + '* <span style="font-style:italic; color: green">Validate</span> ' + message + '<br />\n';
        seen[v] = 1;
      });
      jt.assignedTo.forEach(function(a) {
        if (!seen[a]) {
          cc[a] = (cc[a] || ccTitle) + '* <i>Needs validation from ' + jt.validator.toString().replace(/User:/, '') + '</i> ' + message + '<br />\n';
        }
      });
/**
* Notify assignee
**/
    } else if (jt.status == 'Update') {
      var seen = {};
      jt.assignedTo.forEach(function (a) {
        action[a] = (action[a] || actionTitle) + '* <span style="font-style:italic; color: green">Update</span> ' + message + '<br />\n';
        seen[a] = 1;
      });
      jt.validator.forEach(function (v) {
        if (!seen[v]) {
          action[v] = (action[v] || actionTitle) + '* <span style="font-style:italic; color: green">Validate</span> ' + message + '<br />\n';
        }
      });
/**
* notify both
**/
    } else {
      var seen = {};
      jt.validator.forEach(function (v) {
        cc[v] = (cc[v] || ccTitle) + '* <span style="font-style:italic; color: peach">' + jt.status + '</span> ' + message + '<br />\n';
        seen[v] = 1;
      });
      jt.assignedTo.forEach(function(a) {
        if (!seen[a]) {
          cc[a] = (cc[a] || ccTitle) + '* <span style="font-style:italic; color: peach">' + jt.status + '</span> ' + message + '<br />\n';
        }
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

/**
* Send notifications according to configured GLOBAL.CONFIG.notify
*/

exports.sendNotifications = function(notifications) {

  var transport = GLOBAL.CONFIG.notify.notifyTransport;

  for (var u in notifications) {
    var addy = null, user = notifier.getUser(u);
    if (user) {
      addy = semwiki.val(user, 'Contact address')[0];
    }
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

/**
* a particular notification
**/

var notifier = {
  toSend : [], allUsers : null,

  reset : function() {
    this.toSend = []; 
    this.allUsers = {};
  },

/**
* normalizes and attempts to retrieve a user
*/

  getUser : function(u) {
    if (u.indexOf('User:')< 0) {
      u = 'User:'+u;
    }
    return this.allUsers[u];
  },


/**
* Store a notification out of this ticket
*/

  addNotify : function(ticket) {
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
      modificationDateSeconds : semwiki.dateSeconds(ticket, 'Modification date'),
      name : ticket.fulltext,
      link : ticket.fullurl,
      tags: []
    }
    if (jt.dateRequired[0] && jt.dateRequired[0].getTime() < new Date().getTime()) {
      jt.tags.push('OVERDUE');
    }

    jt.assignedTo.forEach(function (u) {
      var user = notifier.getUser(u);
      if (user) {
        semwiki.val(user, 'Current activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Current'); });
        semwiki.val(user, 'Planned activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Planned'); });
      } else {
        console.error("Missing user " + u);
      }
    });

    this.toSend.push(jt);
  }
}

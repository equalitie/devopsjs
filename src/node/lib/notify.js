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
*  Get current pages focusing on tickets, and users if not configured, from wiki according to query, then process them
*
**/

exports.processTickets = function(pageQuery, callback) {
  var getWikiQueue = queue();
  getWikiQueue.defer(function(cb) {
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, cb);
  });
  getWikiQueue.awaitAll(function(err) {
    var getPagesQueue = queue(1);

    if (!notifier.allUsers) {
      getPagesQueue.defer(function(cb) {
        semwiki.getUsers(function(users) {
          notifier.allUsers = users;
          cb();
        });
      });
    }
    getPagesQueue.defer(function(cb) {
      semwiki.getTickets(pageQuery, function(pages) {
        var c = 0, g = Object.keys(pages).length;
        for (var page in pages) {
          (function(page) {
          semwiki.getExpandedText('{{:'+page+'}}', null, function(text) {
            notifier.addCandidate(pages[page], text);
            if (++c == g) { cb(); }
          });
        }(page));
        } 
      });
    });
    getPagesQueue.awaitAll(function(err) {
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
  var action = {}, cc = {}, watch = {}, actionTitle = '<h2>Action items</h2>\n', ccTitle = '<h2>Monitoring items</h2>\n', watchTitle = "<h2>Watchwords</h2>\n";

  notifier.toSend.forEach(function(jt) { // first break out if it's an action item or watching item and assign it to appropriate section
    var linktext = '<a href="' + jt.link + '">'+jt.name.replace(/^Ticket:/, '') + '</a>'
    var message =  linktext + ' <b>' + jt.importance + '</b> ' + (jt.tags.length > 0 ? '['+jt.tags+']' : ''); 
    message = message + ' ' + jt.lastUpdate + ' by ' + jt.lastProvider + (jt.lastComment ? '; ' + jt.lastComment : '');
/** Action item for validator, notify for updater */ 
    if (jt.categories.indexOf('Ticket tracker') > -1) {
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
/** Notify assignee **/
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
/** notify both **/
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
    }
/** check for watchwords **/
    var t = jt.text.replace(/<[^>]*>/g, '').toLowerCase();
    for (var u in notifier.allUsers) {
      var user = notifier.allUsers[u];
      semwiki.val(user, 'Watchwords').forEach(function(w) {
        var re = new RegExp(w, 'gi');
        if (t.search(re) > -1) {
          var matches = '';
          while (match = re.exec(t)) {
            matches += ' …' + t.substring(Math.max(match.index - 15, 0), Math.min(match.index + w.length + 15, t.length)) + '…';
          }
          watch[u] = (watch[u] || watchTitle) + '* <span style="font-style:italic; color: orange">' + w + '</span> ' + linktext + ': ' + matches + '<br />\n';
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
  for (var user in watch) {
    m[user] = (m[user] || '') + watch[user];
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
* Process text in page and add to candidates
*/

  addCandidate : function(page, text) {
    var m = text.match(new RegExp(/\[\[category:[^\]]*]]/gi));
    var cats = [];
    if (m) {
      m.forEach(function(c) {
        cats.push(c.replace(/.*:/, '').replace(']]', ''));
      });
    }
    var jt = {
      status : semwiki.val(page, 'Ticket status'),
      assignedTo : semwiki.val(page, 'Assigned to'),
      validator : semwiki.val(page, 'Validator'),
      contact : semwiki.val(page, 'Contact'),
      dateRequired : semwiki.date(page, 'Date required'),
      lastUpdate : semwiki.date(page, 'Last update'),
      lastProvider : semwiki.val(page, 'Last provider'),
      lastComment : semwiki.val(page, 'Last comment'),
      importance : semwiki.val(page, 'Importance'),
      modificationDate : semwiki.date(page, 'Modification date'),
      modificationDateSeconds : semwiki.dateSeconds(page, 'Modification date'),
      name : page.fulltext,
      link : page.fullurl,
      text : text,
      categories : cats,
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


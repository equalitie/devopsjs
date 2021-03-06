/*jshint loopfunc: true*/
var semwiki = require('./semwiki.js');
var logger = GLOBAL.CONFIG.logger;
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
*  Get current pages from wiki according to query, wiki expand and return populated notifier
*
**/

exports.retrieveActivities = function(pageQuery, users, callback) {
  notifier.allUsers = users;
  var getWikiQueue = queue();
  getWikiQueue.defer(function(cb) {
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, cb);
  });
  getWikiQueue.awaitAll(function(err) {
    var getPagesQueue = queue();

    getPagesQueue.defer(function(cb) {
      semwiki.getActivities(pageQuery, function(pages) {
        var c = 0, g = Object.keys(pages).length;
        logger.debug('getting expanded pages');
        for (var page in pages) {
          (function(page) {
          semwiki.getExpandedText('{{:'+page+'}}', null, function(text) {
            logger.debug('getExpandedText', page);
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
};

/** 
* get notifier with these users
**/

exports.getNotifier = function(users, pages) {
  notifier.reset();
  notifier.allUsers = users;
  return notifier;
};

/**
* 
* Create the notifications based on data
*/

exports.composeNotifications = function(notifier) {
  logger.debug('composeNotifications');
  var action = {}, cc = {}, watch = {}, actionTitle = '<h2>Action items</h2>\n', ccTitle = '<h2>Monitoring items</h2>\n', watchTitle = "<h2>Watchwords</h2>\n";

  notifier.toProcess.forEach(function(jt) { // first break out if it's an action item or watching item and assign it to appropriate section
    var linktext = '<a href="' + jt.link + '">'+jt.name.replace(/^Activity:/, '') + '</a>';
    var message =  linktext + ' <b>' + jt.importance + '</b> ' + (jt.tags.length > 0 ? '['+jt.tags+']' : ''); 
    message = message + ' ' + jt.lastUpdate + ' by ' + jt.lastProvider + (jt.lastComment ? '; ' + jt.lastComment : '');
/** Action item for validator, notify for updater */ 
    var seen;
    if (jt.categories.indexOf('Activity tracker') > -1) {
      if (jt.status == 'Validate') {
        seen = {};
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
        seen = {};
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
        seen = {};
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
          while ((match = re.exec(t)) !== null) {
            matches += ' …' + t.substring(Math.max(match.index - 15, 0), Math.min(match.index + w.length + 15, t.length)) + '…';
          }
          watch[u] = (watch[u] || watchTitle) + '* <span style="font-style:italic; color: orange">' + w + '</span> ' + linktext + ': ' + matches + '<br />\n';
        }
      });
    }
  });
  var m = {}; // then create grouped message texts in appropriate order
  var user;
  for (user in action) {
    m[user] = (m[user] || '') + action[user];
  }
  for (user in cc) {
    m[user] = (m[user] || '') + cc[user];
  }
  for (user in watch) {
    m[user] = (m[user] || '') + watch[user];
  }
  return m;
};

/**
* Send notifications according to configured GLOBAL.CONFIG.notify
*/

exports.sendNotifications = function(notifications) {

  var transport = GLOBAL.CONFIG.notify.notifyTransport;

  var sendMailQueue = queue();
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
      };

      logger.debug('sendNotification', addy, transport);

      sendMailQueue.defer(function(cb) {
        transport.sendNotification(messageOptions, function(error, response) {
          if (error){
            logger.error(error);
          }
          logger.debug('sentNotification', addy);
          cb();
        });
      });
    } else {
      logger.error('missing Contact address for ' + u);
    }
  }
  sendMailQueue.awaitAll(function(err) {
    transport.close(); 
  });
};

/**
* a particular notification
**/

var notifier = {
  toProcess : [], allUsers : null,

  reset : function() {
    this.toProcess = []; 
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
      status : semwiki.val(page, 'Activity status'),
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
    };
    if (jt.dateRequired[0] && jt.dateRequired[0].getTime() < new Date().getTime()) {
      jt.tags.push('OVERDUE');
    }

    jt.assignedTo.forEach(function (u) {
      var user = notifier.getUser(u);
      if (user) {
        semwiki.val(user, 'Current activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Current'); });
        semwiki.val(user, 'Planned activity').forEach(function (a) { if (a == jt.name) jt.tags.push('Planned'); });
      } else {
        logger.error("Missing user " + u);
      }
    });

    this.toProcess.push(jt);
  }
};


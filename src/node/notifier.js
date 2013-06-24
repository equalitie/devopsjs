var semwiki = require('./lib/semwiki.js');
var queue = require('queue-async');

var configBase;
if (process.env.DEVOPSCONFIG) {
  configBase = process.env.DEVOPSCONFIG;
} else {
  configBase = process.cwd() + '/config/';
}

var toSend = []; // buffered messages

try {
  require(configBase + 'localConfig.js');
} catch (e) {
  throw 'Could not require "' + configBase + '/localConfig.js" — define DEVOPSCONFIG or run this program from its parent directory.';
}

allTickets();

function allTickets() {
  var getWikiQueue = queue();
  getWikiQueue.defer(function(callback) {
    semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, callback);
  });
  getWikiQueue.awaitAll(function(err) {
    var getTicketsQueue = queue();

    getTicketsQueue.defer(function(callback) {
      semwiki.getTickets('[[Category:Unresolved tickets]]', function(tickets) {
        for (var ticket in tickets) {
          addNotify(tickets[ticket]);
        }
        callback();
      });
    });
    getTicketsQueue.awaitAll(function(err) {
console.log('send', toSend.length);
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
    importance : semwiki.val(ticket, 'Importance'),
    modificationDate : semwiki.val(ticket, 'Modification date'),
    name : ticket.fulltext,
    link : ticket.fullurl,
  }
console.log(jt.name, jt.status);

  addMail(jt);
}

function addMail(jt) {
  toSend.push(jt);
}

function sendMail() {
  var validate = {};
  var update = {};
  var cc = {};

  toSend.forEach(function(jt) { // first break out if it's an action item or watching item
    var message = '* <a href="' + jt.link + '">'+jt.name + '</a> <b>' + jt.importance + '</b> '; 
    var actionTitle = '== Action items ==<br />\n';
    var ccTitle = '<br />\n== Watching items ==<br />\n';
    if (jt.status == 'Validate') {
      jt.validator.forEach(function (v) {
        validate[v] = (validate[v] || actionTitle) + message + ' <i>Validate</i><br />\n';
      });
      jt.assignedTo.forEach(function(a) {
       cc[a] = (cc[a] || actionTitle) + message + ' <i>Waiting for validation from ' + jt.validator + '</i><br />\n';
      });
    } else {
      jt.assignedTo.forEach(function (a) {
        update[a] = (update[a] || ccTitle) + message + ' <i>Update</i><br />\n';
      });
    }
  });
  var m = {}; // then create message texts in appropriate order
  for (var v in validate) {
    var message = validate[v];
    m[v] = (m[v] || '') + message;
  }
console.log('<br />\n***M', m);
  for (var v in update) {
    var message = update[v];
    m[v] = (m[v] || '') + message;
  }
  for (var v in cc) {
    var message = cc[v];
    m[v] = (m[v] || '') + message;
  }
  var nodemailer = require("nodemailer");

  var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");

  for (var u in m) {
    console.log('<br />\n<br />\n***', u, JSON.stringify(m[u]));
    var mailOptions = {
        from: "eqwiki mailer <webs@equalit.ie>",
        to: u + " <vid@zooid.org>",
        subject: "Wiki ticket notifications", 
        text: m[u].replace(/<.*?>/g, ''), // plaintext body
        html: m[u] // html body
    }

    transport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }
    });
  }
  transport.close(); // shut down the connection pool, no more messages
}


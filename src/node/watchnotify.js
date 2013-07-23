var queue = require('queue-async');
var program = require('commander');
var moment = require('moment');

var semwiki = require('./lib/semwiki.js');
var utils = require('./lib/util.js');
utils.config();
var notify = require('./lib/notify.js');

program
  .option('--delay <delay>', 'seconds between checks')
  .option('--iterations', 'run this many times')
  .option('--conf <directory>', 'config directory for notifyTimestamp');

var conf = utils.slashedDir(program.conf || utils.getConfigBase());

program.parse(process.argv);

var delay = program.delay || 30;
var dir = program.dir;

var fs = require('fs');

var nextSince = null;
var running = false;
var iterations = 0;


var query;
try {
  nextSince = require(conf + 'notifyTimestamp.json');
  console.log('retrieved nextSince', nextSince);
  query = getQuery(nextSince);
} catch (e) {
  query = '[[Modification date::+]]|limit=1';
}
setInterval(function() {
  if (!running) {
    iterations++;
    if (program.iterations > 0 && iterations > program.iterations) {
      process.exit();
    }
    running = true;
    notify.processTickets(query, function(err, notifier) {
      notifier.toSend.forEach(function(t) {
        if (nextSince == null || moment(t.modificationDate[0]).isAfter(nextSince)) {
          nextSince = t.modificationDate[0];
          console.log('new nextSince', nextSince);
        }
      });
      var p = notify.composeNotifications(notifier);
      notify.sendNotifications(p);
      if (notifier.toSend.length > 0) {
        query = getQuery(nextSince);
        notifier.toSend = [];
        fs.writeFileSync(utils.slashedDir(conf) + 'notifyTimestamp.json', JSON.stringify(nextSince));
      }
      running = false;
    });
  }
}, delay * 1000);

function getQuery(nextSince) {
  var since = moment(nextSince).add("minutes", moment().zone()).add("seconds", 1).format('MMM Do YYYY, H:mm:ss'); // timezone offset + 1 second since smw's > is >=
  return '[[Modification date::>' + since+ ']]'
}

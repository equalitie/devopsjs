/*jshint node:true */
var queue = require('queue-async');
var program = require('commander');
var moment = require('moment');

var utils = require('./lib/util.js');
utils.config();
var semwiki = require('./lib/semwiki.js');
var logger = GLOBAL.CONFIG.logger;
var notify = require('./lib/notify.js');

program
  .option('--conf <directory>', 'config directory for notifyTimestamp');

var conf = utils.slashedDir(program.conf || utils.getConfigBase());

program.parse(process.argv);

var delay = program.delay || 30;
var dir = program.dir;

var fs = require('fs');

var nextSince = null;
var iterations = 0;

var query;
try {
  nextSince = require(conf + 'notifyTimestamp.json');
  logger.info('retrieved nextSince', nextSince);
  query = getQuery(nextSince);
} catch (e) {
  query = '[[Modification date::+]]|limit=2';
}

/** get users then process activitys **/
logger.debug('getting wiki');
semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, function() {
  logger.debug('getting users');
  semwiki.getUsers(function(users) {
    logger.debug('processing activitys');
    processActivities(users);
  });
});

function processActivities(users) {
  notify.retrieveActivities(query, users, function(err, notifier) {
    notifier.toProcess.forEach(function(t) {
      if (nextSince === null || moment(t.modificationDate[0]).isAfter(nextSince)) {
        nextSince = t.modificationDate[0];
        logger.info('new nextSince', nextSince);
      }
    });
    var p = notify.composeNotifications(notifier);
    notify.sendNotifications(p);
    if (notifier.toProcess.length > 0) {
      query = getQuery(nextSince);
      notifier.toProcess = [];
      // why we use Sync?
      fs.writeFileSync(utils.slashedDir(conf) + 'notifyTimestamp.json', JSON.stringify(nextSince));
    }
  });
}

function getQuery(nextSince) {
  var since = moment(nextSince).add("minutes", moment().zone()).add("seconds", 1).format('MMM Do YYYY, H:mm:ss'); // timezone offset + 1 second since smw's > is >=
  return '[[Modification date::>' + since+ ']]';
}

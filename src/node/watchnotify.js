require('./lib/util.js').config();

var program = require('commander');

program
  .option('--delay <delay>', 'seconds between checks')
  .option('--dir <directory>', 'directory to watch');

program.parse(process.argv);

var delay = program.delay || 30;
var dir = program.dir;

var fs = require('fs');

setInterval(function() {
  var files = fs.readdirSync(dir);
  var notify = require('./lib/notify.js');
  files.forEach(function(f) {
console.log(f);
    query = '[[' + f + ']]';
    notify.processTickets(query, function(notifier) {
      var p = notify.composeNotifications(notifier);
      notify.sendNotifications(p);
    });
    fs.unlinkSync(dir + '/' + f);
  });
}, delay * 1000);


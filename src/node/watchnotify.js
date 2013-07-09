require('./lib/util.js').config();

var notify = require('./lib/notify.js');

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
  files.forEach(function(f) {
    query = '[[' + f + ']]';
    notify.processTickets(query);
    fs.unlinkSync(dir + '/' + f);
  });
}, delay * 1000);


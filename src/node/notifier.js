require('./lib/util.js').config();

var notify = require('./lib/notify.js');

var program = require('commander');

program
  .option('--page <page>', 'remove from configuration');

program.parse(process.argv);

var query = '[[Category:Unresolved tickets]]';

if (program.page) {
  query = '[[' + program.page + ']]';
} 

notify.processTickets(query, function(err, notifier) {
  var p = notify.composeNotifications(notifier);
  notify.sendNotifications(p);
});

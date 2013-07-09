var DEBUG = true;
if (DEBUG) {
  var nomo = require('node-monkey').start();
}

require('./lib/util.js').config();

var notify = require('./lib/notify.js');

notify.processTickets('[[Category:Unresolved tickets]]');



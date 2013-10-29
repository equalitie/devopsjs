/**
 *
 * Author: David H. Mason
 *
 * Load merged hosts and determined if queried host is part of a DNET.
 * If so, print it and update information.
 * Otheriwse, print not found.
 *
 **/

var moment = require('moment');
var utils = require('./lib/util.js');
utils.config();
var hostLib = require('./lib/hosts.js');
var hosts = hostLib.getDNET('MERGED');

var query = process.argv[2];

var response = null;

hosts.forEach(function(host) {
  if (host.hostname === query) {
    response = host.lastDNET + ' (' + host.DNET + ') ' + moment(host.lastDNETChange).fromNow();
  }
});
if (response) {
  console.log(response);
} else {
  console.log('host not found');
}

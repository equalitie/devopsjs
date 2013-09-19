#!/usr/bin/env node

var utils = require('./lib/util.js');

var program = require('commander');
var hostLib = require('./lib/hosts.js');

program
  .option('-A, --dnet <config>', 'specify dnet (mandatory)')
  .option('--add <host>', 'add to configuration')
  .option('--remove <host>', 'remove from configuration')
  .option('-n, --online <host>', 'online from maintenance')
  .option('-f, --offline <host>', 'offline for maintenance')
  .option('-a, --activate <host>', ' make host active')
  .option('-d, --deactivate <host>', 'make host inactive')
  .option('-g, --advice', 'rotation advice')
  .option('-r, --rotate', 'do auto-rotation')
  .option('--rin <host>', 'auto-rotate in host')
  .option('--rout <host>', 'auto-rotate out host')
  .option('--timespan <hours>', 'set timespan for advice/rotate [' + hostLib.config.defaultPeriod + ' ' +  hostLib.config.defaultUnits + ']')
  .option('-t, --testhost <host>', 'live test host')
  .option('-q, --query <host> [period]', 'query host test results')
  .option('-v --verbose', 'verbose output')
  .option('--writeall <file>', 'write all hosts to a flat file')
  .option('-s --stats', 'current statistics')

  .option('--override', 'override defaults')
  .option('-c, --comment <description>', 'comment for the action')
  .option('--tag', 'tag command');

/* argument processing **/
program.on('--help', function() {
  console.log('Commands can be chained, one per action. For example:');
  console.log('');
  console.log('    $ edgemanage -a edge1 -f edge2 -s -c \'replacing broken edge2 with edge1\'');
  console.log('');
  console.log('will make edge1 active, take edge2 offline, and print statistics.');
});

program.parse(process.argv);
if (program.comment && program.args) { program.comment = [program.comment].concat(program.args).join(' '); } // FIXME. munges comment 

utils.config({ dnet : program.dnet});
if (!program.dnet) {
  throw "dnet is required";
}

if (!GLOBAL.CONFIG.minActive) {
  throw "minActive not defined";
}

var flatHostsFile = null;
if (GLOBAL.CONFIG.flatHostsFile) {
  flatHostsFile = (GLOBAL.CONFIG.flatHostsFile.substring(0, 1) === '/' ? '' : GLOBAL.CONFIG.configBase) + GLOBAL.CONFIG.flatHostsFile;
}  

hostLib = hostLib.setConfig(program, GLOBAL.CONFIG.configBase + 'hosts.' + program.dnet + '.json');

if (program.verbose) {
  console.log('configBase is "' + GLOBAL.CONFIG.configBase + '", flatHostsFile is "' + flatHostsFile + '"');
}

if (program.add) {
  mustComment();
  program.add = domained(program.add);
  var hp = hostLib.addHost(program.add);
  hostLib.writeHosts(hp.hosts, ['add', program.add], program.add);
  console.log(program.add + ' is added');
}

if (program.remove) {
  mustComment();
  program.remove = domained(program.remove);
  var hp = hostLib.removeHost(program.remove, null, function(hp) {
    hostLib.writeHosts(hp.hosts, ['remove', program.remove], program.remove);
  });
  hostLib.writeHosts(hp.hosts, program.remove);
  console.log(program.remove + ' is removed');
}

if (program.online) {
  mustComment();
  program.online = domained(program.online);
  var hp = hostLib.setOnline(program.online);
  hostLib.writeHosts(hp.hosts, ['online', program.online], program.online);
  console.log(program.online + ' is online');
}

if (program.offline) {
  mustComment();
  program.offline = domained(program.offline);
  var hp = hostLib.setOffline(program.offline);
  hostLib.writeHosts(hp.hosts, ['offline', program.offline], program.offline);
  console.log(program.offline + ' is offline');
}

if (program.activate) {
  mustComment();
  program.activate = domained(program.activate);
  var hp = hostLib.activate(program.activate);
  hostLib.writeHosts(hp.hosts, ['activate', program.activate], program.activate);
  console.log(program.activate + ' is active');
}

if (program.deactivate) {
  mustComment();
  program.deactivate = domained(program.deactivate);
  var hp = hostLib.deactivate(program.deactivate);
  hostLib.writeHosts(hp.hosts, ['deactivate', program.deactivate], program.deactivate);
  console.log(program.deactivate + ' is inactive');
}

if (program.advice) {
  var num = program.timespan ? program.timespan :  hostLib.config.defaultPeriod;
  hostLib.getStats(num, hostLib.advise);
}

if (program.rotate) {
  hostLib.getStats(num, hostLib.rotate);
}

if (program.rin) {
  mustComment();
  program.rin = domained(program.rin);
  var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
  hostLib.getStats(num, hostLib.rotate);
}

if (program.rout) {
  mustComment();
  program.rout = domained(program.rout);
  var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
  hostLib.getStats(num, hostLib.rotate);
}

if (program.testhost) {
  program.testhost = domained(program.testhost);
  var check = require('./lib/nrpe/check.js');
  var testname = 'check_tcptraffic';
  var test = require('./lib/nrpe/allchecks.js').getChecks(testname)[testname];
  check.checkHost(program.testhost, test, testname, utils.getTick(), function(res) {
    console.log(res);
  });
}

if (program.query) {
  console.log(hostLib.getHostsSummary());
}

if (program.stats) {
  console.log(hostLib.getHostsSummary());
}

if (program.writeall) {
  var hp = hostLib.getHosts();
  hostLib.writeFlatHosts(hp.hosts, true, program.writeall);
}

function mustComment () {
  if (!program.comment) {
    throw "You must enter a comment. use --help for help.";
  }
}

/*
* add subdomain if missing & known
*/

function domained(host) {
  if (GLOBAL.CONFIG.subdomain && host && host.indexOf('.') < 0) {
    host = host + '.' + GLOBAL.CONFIG.subdomain;
  }
  return host;
}


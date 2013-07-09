#!/usr/bin/env node

require('./lib/util.js').config();

if (!GLOBAL.CONFIG.minActive) {
	throw "minActive not defined";
}

var flatHostsFile = null;
if (GLOBAL.CONFIG.flatHostsFile) {
	flatHostsFile = (GLOBAL.CONFIG.flatHostsFile.substring(0, 1) === '/' ? '' : GLOBAL.CONFIG.configBase) + GLOBAL.CONFIG.flatHostsFile;
}	

var program = require('commander');
var hostLib = require('./lib/hosts.js');

program
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

  .option('--override', 'override validation error')
  .option('-c, --comment <\'description\'>', 'comment for the action')
  .option('-i, --incident', 'file comment as an incident report');

/* argument processing **/
program.on('--help', function() {
  console.log('Commands can be chained, one per action. For example:');
  console.log('');
  console.log('    $ edgemanage -a edge1 -f edge2 -s -c \'replacing broken edge2 with edge1\'');
  console.log('');
  console.log('will make edge1 active, take edge2 offline, and print statistics.');
});

program.parse(process.argv);

hostLib = hostLib.setConfig(program, GLOBAL.CONFIG.configBase + 'hosts.json', require('solr-client'));

if (program.verbose) {
	console.log('configBase is "' + GLOBAL.CONFIG.configBase + '", flatHostsFile is "' + flatHostsFile + '"');
}

if (program.add) {
	hostLib.mustComment();
	var hp = hostLib.addHost(program.add);
	hostLib.writeHosts(hp.hosts, program.add);
	console.log(program.add + ' is added');
}

if (program.remove) {
	hostLib.mustComment();
	var hp = hostLib.removeHost(program.remove, null, function(hp) {
		hostLib.writeHosts(hp.hosts, program.remove);
	});
	hostLib.writeHosts(hp.hosts, program.remove);
	console.log(program.remove + ' is removed');
}

if (program.online) {
	hostLib.mustComment();
	var hp = hostLib.setOnline(program.online);
	hostLib.writeHosts(hp.hosts, program.online);
	console.log(program.online + ' is online');
}

if (program.offline) {
	hostLib.mustComment();
	var hp = hostLib.setOffline(program.offline);
	hostLib.writeHosts(hp.hosts, program.offline);
	console.log(program.offline + ' is offline');
}

if (program.activate) {
	hostLib.mustComment();
	var hp = hostLib.activate(program.activate);
	hostLib.writeHosts(hp.hosts, program.activate);
	console.log(program.activate + ' is active');
}

if (program.deactivate) {
	hostLib.mustComment();
	var hp = hostLib.deactivate(program.deactivate);
	hostLib.writeHosts(hp.hosts, program.deactivate);
	console.log(program.deactivate + ' is inactive');
}

if (program.advice) {
	var num = program.timespan ? program.timespan :  hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.advise);
}

if (program.rotate) {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

if (program.rin) {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

if (program.rout) {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

if (program.testhost) {
	var check = require('./lib/nrpe/check.js');
	var test = require('./lib/nrpe/allchecks.js').getChecks(GLOBAL.hostTestName);

	check.checkEdge(program.testhost, test, GLOBAL.hostTestName, utils.getTick(), function(res) {
		console.log(res);
	});
}

if (program.query) {
	console.log(hostLib.getHostSummaries());
}

if (program.stats) {
	console.log(hostLib.getHostSummaries());
}

if (program.writeall) {
	var hp = hostLib.getHosts();
	hostLib.writeFlatHosts(hp.hosts, true, program.writeall);
}

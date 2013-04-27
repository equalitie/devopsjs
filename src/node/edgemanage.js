#!/usr/bin/env node

/** Defaults **/
	
GLOBAL.hostTestName = 'check_fail2ban';

var defaultUnits = 'hours';
var defaultPeriod = 10;
var TERMINAL_ERROR = 1400;
var NOW = new Date().toISOString();

var configBase;
if (process.env.DEVOPSCONFIG) {
	configbase = process.env.DEVOPSCONFIG;
} else {
	configBase = process.cwd() + '/config/';
}	

try {
	require(configBase + '/localConfig.js');
} catch (e) {
	throw 'Could not require localConfig.js. Define DEVOPSCONFIG or run this program from its parent directory.';
}

var flatHostsFile = configBase + GLOBAL.CONFIG.flatHostsFile;
GLOBAL.MIN_EDGES = GLOBAL.CONFIG.minEdges || 6;

var hostsFile = configBase + 'hosts.json';

var fs = require('fs');
var utils = require('./lib/util.js');
var program = require('commander');
var queue = require('queue-async');
var moment = require('moment');
var solr = require('solr-client');
var solrClient = solr.createClient(GLOBAL.CONFIG.solrConfig);

program
  .option('--add <host>', 'add to configuration')
  .option('--remove <host>', 'remove from configuration')
  .option('-n, --online <host>', 'online from maintenance')
  .option('-f, --offline <host>', 'offline for maintenance')
  .option('-a, --activate <host>', ' make host active')
  .option('-d, --deactivate <host>', 'make host inactive')
  .option('-g, --advice [' + defaultPeriod + ']', 'rotation advice [10]')
  .option('-r, --rotate [' + defaultPeriod + ']', 'do auto-rotation [10]')
  .option('-t, --testhost <host>', 'live test host')
  .option('-q, --query <host> [period]', 'query host test results')
  .option('-v --verbose', 'verbose output')
  .option('--writeall <file>', 'write all hosts to a flat file')
  .option('-z, --zonegen', 'execute zongene script')
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

var verbose = program.verbose === true;

if (program.add) {
	mustComment();
	var hp = addHost(program.add);
	writeHosts(hp.hosts, program.add);
	console.log(program.add + ' is added');
}

if (program.remove) {
	mustComment();
	var hp = removeHost(program.remove, null, function(hp) {
		writeHosts(hp.hosts, program.remove);
	});
	writeHosts(hp.hosts, program.remove);
	console.log(program.remove + ' is removed');
}

if (program.online) {
	mustComment();
	var hp = setOnline(program.online);
	writeHosts(hp.hosts, program.online);
	console.log(program.online + ' is online');
}

if (program.offline) {
	mustComment();
	var hp = setOffline(program.offline);
	writeHosts(hp.hosts, program.offline);
	console.log(program.offline + ' is offline');
}

if (program.activate) {
	mustComment();
	var hp = activate(program.activate);
	writeHosts(hp.hosts, program.activate);
	console.log(program.activate + ' is active');
}

if (program.deactivate) {
	mustComment();
	var hp = deactivate(program.deactivate);
	writeHosts(hp.hosts, program.deactivate);
	console.log(program.deactivate + ' is inactive');
}

if (program.advice) {
	var num = program.advice === true ? defaultPeriod : program.advice;
	getStats(num, advise);
}

if (program.rotate) {
	mustComment();
	var num = program.rotate === true ? defaultPeriod : program.rotate;
	getStats(num, rotate);
}

if (program.testhost) {
	var check = require('./lib/nrpe/check.js');
	var test = require('./lib/nrpe/allchecks.js').getChecks(GLOBAL.hostTestName);

	check.checkEdge(program.testhost, test, GLOBAL.hostTestName, utils.getTick(), function(res) {
		console.log(res);
	});
}

if (program.stats) {
	console.log(getHostSummaries());
}

if (program.writeall) {
	var hp = getHosts();
	writeFlatHosts(hp.hosts, true, program.writeall);
}

/** 
 * argument execution
 * 
 * isolate the storage from the functions for testing
 * 
 **/

function addHost(newHost, hosts) {
	var hp = getHostFromHosts(newHost, hosts);
	if (hp.host) {
		throw "host already exists: " + newHost;
	}

	var host = { name_s : newHost, added_dt : NOW, lastUpdate_dt : NOW, comment_s : program.comment};
	hp.hosts.push(host);
	hp.host = host;
	return hp;
}

/**
 * 
 * capture the remove event with the callback
 * 
 */
function removeHost(removeHost, hosts, writeCallback) {
	var hp = getHostFromHosts(removeHost, hosts);
	if (!hp.host) {
		throw "host doesn't' exist: " + removeHost;
	}
	hp.host.removed_dt = NOW;
	writeCallback(hp);
	var newHosts = [];
	for (var i in hp.hosts) {
		var host = hp.hosts[i];
		if (!(host.name_s === removeHost)) {
			newHosts.push(host);
		}
	}
	hp.hosts = newHosts;
	hp.host = null;
	return hp;
}

function setOnline(hostIn) {
	var hp = getHostFromHosts(hostIn, hosts);
	if (!hp.host) {
		throw "no such host: " + hostIn;
	}
	
	var host = hp.host;

	if (!isOffline(host)) {
		throw "host is not offline";
	}
				
	host.offline_b = false;
	host.online_dt = new Date().toISOString();
	host.comment_s = program.comment;
	return hp;
}

function setOffline(hostIn, hosts) {
	var hp = getHostFromHosts(hostIn, hosts);
	if (!hp.host) {
		throw "no such host: " + hostIn;
	}
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is already offline";
	}
	
	host.active_b = false;
	host.offline_b = true;
	host.offline_dt = new Date().toISOString();
	host.comment_s = program.comment;

	return hp;
}

function activate(hostIn, hosts) {
	var hp = getHostFromHosts(hostIn, hosts);
	if (!hp.host) {
		throw "no such host: " + hostIn;
	}
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is offline";
	} else if (isActive(host)) {
		throw "host is already online";
	}
	host.active_b = true;
	host.active_dt = new Date().toISOString();
	host.comment_s = program.comment;
	return hp;
}

function deactivate(hostIn, hosts) {
	var hp = getHostFromHosts(hostIn, hosts);
	if (!hp.host) {
		throw "no such host: " + hostIn;
	}
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is offline";
	} else if (isInactive(host)) {
		throw "host is already inactive";
	}
	
	host.active_b = false;
	host.inactive_dt = new Date().toISOString();
	host.comment_s = program.comment;
	return hp;
}

function advise(err, stats) {
	var advice = getRotateAdvice(stats);
	if (advice.removeActive === null || advice.addInactive === null) {
		throw "Can't advise" + JSON.stringify(advice);
	}
	console.log(process.argv[1] + ' --activate ' + advice.addInactive.name + ' --deactivate ' + advice.removeActive.name + ' -c "replace ' + advice.removeActive.name + ' ' + advice.removeActive.stats.since +  ' w ' + advice.addInactive.name + ' ' + advice.addInactive.stats.since + '"'); 
}

function rotate(err, stats) {
	var advice = getRotateAdvice(stats);
	if (advice.removeActive === null || advice.addInactive === null) {
		throw "Can't rotate" + JSON.stringify(advice);
	}
	
	var hp = activate(advice.addInactive.name);
	hp = deactivate(advice.removeActive.name, hp.hosts);
	writeHosts(hp.hosts);	// FIXME: move storage to higher level
	console.log('replaced ' + advice.removeActive.name + ' ' + advice.removeActive.stats.since +  ' w ' + advice.addInactive.name + ' ' + advice.addInactive.stats.since);
}

/** utilities **/

function getRotateAdvice(stats) {
	var summaries = getHostSummaries();
	var averages = stats.averages;
	var hostSummaries = stats.hostSummaries;

	if (summaries.inactiveHosts < 1) {
		throw 'no inactive hosts to rotate with';
	}
	
	var removeActive;
	var addInactive;
	
	for (var i in summaries.activeHosts) { // get oldest active host to deactivate
		var host = summaries.activeHosts[i];
		if (verbose) {
			console.log('removeActive', i, removeActive ? (host.active_dt + ' vs ' + removeActive.stats.active_dt + ': ' 
					+ (moment(host.active_dt).diff(removeActive.stats.active_dt))) : 'null');
		}
			
		if (!removeActive || (moment(host.active_dt).diff(removeActive.stats.active_dt) < 0)) {
			removeActive = { name : i, stats : host};
			if (verbose) {
				console.log("candidate", moment(removeActive.stats.active_dt).format("dddd, MMMM Do YYYY, h:mm:ss a"));
			}
		}
	}
	
	var tries = summaries.inactive;
	var lowestError = null;	// use this host if no other option
	
	for (var i in summaries.inactiveHosts) { // get oldest inactive host to activate
		var host = summaries.inactiveHosts[i];
		if (verbose) {
			if (!hostSummaries[i]) {
				console.log('addInactive', i + ' no reports');
			} else {
				console.log('addInactive', i + ' err: ' + hostSummaries[i].errorWeight, addInactive ? (host.inactive_dt + ' vs ' + addInactive.stats.inactive_dt + ': ' 
					+ (moment(host.inactive_dt).diff(addInactive.stats.inactive_dt))) : 'null');
			}
		}
		if (!addInactive || (moment(host.inactive_dt).diff(addInactive.stats.inactive_dt) < 0)) {
			var rec = hostSummaries[i];

			if (rec && rec.errorWeight < 1) { // it has had reports and they are perfect
				addInactive = { name : i, stats : host};
				if (verbose) {
					console.log("candidate", moment(removeActive.stats.inactive_dt).format("dddd, MMMM Do YYYY, h:mm:ss a"));
				}
			} else {
				if (!lowestError || (rec && rec.errorWeight < lowestError.errorWeight)) {	// it has had reports and they are not the worst
					console.log('adding lowest errored host');
					lowestError = i;
				}
			}
		}
	}
	
	if (!addInactive && lowestError && lowestError.erroWeight < TERMINAL_ERROR) {
		addInactive = { name : lowestError, stats : summaries.inactiveHosts[lowestError]};
	}
	
	return {removeActive : removeActive, addInactive : addInactive};
}

function validateConfiguration(hosts) {	// make sure the resulting config makes sense
	var stats = getHostSummaries(hosts);
	if (stats.active < GLOBAL.MIN_EDGES) {
		if (program.override) {
			console.log("overridding required hosts");
		} else {
			throw "not enough available hosts; " + stats.active + ' (required: ' + GLOBAL.MIN_EDGES + ')';
		}
	}
}

function getHosts() {
	return require(hostsFile);
}

function getHostSummaries(hosts) {
  if (!hosts) {
	hosts = require(hostsFile);
  }
	
  var available = 0;
  var unavailable = 0;
  var offline = 0;
  var active = 0;
  var inactive = 0;
  var activeHosts = {};
  var inactiveHosts = {};
  var offlineHosts = {};
  var total = 0;

  for (var h in hosts) { 
    total++;
	var host = hosts[h];

	if (isAvailable(host)) {
	  available++;
	} else{
	  unavailable++;
	}
	if (isActive(host)) {
		active++;
		activeHosts[hosts[h].name_s] = { active_dt : host.active_dt, since : moment(host.active_dt).fromNow(), commment : hosts[h].comment_s };
	}
	if (isOffline(host)) {
		offline++;
		offlineHosts[hosts[h].name_s] = { offline_dt : host.offline_dt, since : moment(host.offline_dt).fromNow(), comment : hosts[h].comment_s };
	} else if (isInactive(host)) {
		inactive++;
		inactiveHosts[hosts[h].name_s] = { inactive_dt : host.inactive_dt, since : moment(host.inactive_dt).fromNow(), comment : hosts[h].comment_s };
	}
  }
  return { total : total, active : active, activeHosts: activeHosts, inactive : inactive, inactiveHosts: inactiveHosts, available : available, unavailable : unavailable, offline : offline, offlineHosts: offlineHosts, required : GLOBAL.MIN_EDGES};
}

/** get host and updated hosts. retrieves hosts if not passed. **/

function getHostFromHosts(hostIn, hosts) {
	if (!hosts) {
		hosts = require(hostsFile);
	}
	for (var h in hosts) {
		var host = hosts[h];
		if (host.name_s === hostIn) {
			return { hosts : hosts, host : host, position: h};
		}
	}
	return { hosts : hosts};
}

function writeHosts(hosts, changedHost) {
	validateConfiguration(hosts);
	
	fs.writeFileSync(hostsFile, JSON.stringify(hosts, null, 2));
	if (flatHostsFile) {
		if (verbose) {
			console.log('writing to ' + hostsFile);
		}
		writeFlatHosts(hosts);
	}
	
	var sum = getHostSummaries(hosts);
	var summary = {comment_s : program.comment, operator_s : process.env.SUDO_USER || process.env.USER
       , active_i: sum.active, inactive_i: sum.inactive, offline_i: sum.offline
       , date_dt : new Date().toISOString(), class_s : 'edgemanage_test', id : new Date().getTime()};
	var docs = [summary];

	for (var i in hosts) {
		var host = hosts[i];
		if (changedHost && !changedHost === host.name_s) {
			continue;
		}
		
		var doc = {};
		for (var d in host) {
			if (host.hasOwnProperty(d)) {
				doc[d] = host[d];
			}
		}
			
		doc.date_dt = NOW;
		doc.class_s = 'host state';
		doc.id = host.name_s + '/' + NOW;
		docs.push(doc);
	}
	solrClient.add(docs, function(err,obj){
	  if(err){
	    throw "commit ERROR: " + err;
	  }
	});
}

/** 
 * write complete list of hosts
 */
function writeFlatHosts(hosts, writeAll, file) {
	if (!file) {
		file = flatHostsFile;
		if (!file) {
			throw 'no flatHostsFile defined', flatHostsFile;
		}
	}

	var contents = writeAll ? '# complete list of hosts as of ' + new Date() + '\n' : "# do not edit this file directly, use edgemanage instead\n";
	for (var h in hosts) {
		var host = hosts[h];
		var line = null;
		var name = host.name_s;
		if (isActive(host) || writeAll) {
			line = name;
		} else if (isOffline(host)) {
			line = '# ' + host.comment_s + '\n#' + name;
		} else { // inactive
			line = '## ' + name;
		}
		contents += line + '\n';		
	}
	fs.writeFileSync(file, contents);
}

function isInactive(host) {
	return !host.active_b;
}

function isActive(host) {
	return host.active_b;
}

function isOffline(host) {
	return host.offline_b;
}

function isAvailable(host) {
	return (!isInactive(host) && !isOffline(host));
}

function getStats(num, callback) {
	num = 0 + parseInt(num);
	
	var hosts = require(hostsFile);
	var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks();
	
	var getStatsQueue = queue();
	var period = moment(moment() - moment().diff(num, defaultUnits)).format() + 'Z'; // FIXME use Date.toISOString();

	for (var n in nrpeChecks) {
		for (var h in hosts) {
			var host = hosts[h].name_s;
		
			getStatsQueue.defer(function(callback) {
				var statsQuery = solrClient.createQuery()
					.q({edge_s : host, aCheck_s : n, tickDate_dt : '[' + period + ' TO NOW]'}).sort({tickDate_dt:'asc'});
	
				solrClient.search(statsQuery, callback);
			}); 
		}
	}
	getStatsQueue.awaitAll(function(err, results) {
		if (err) {
			throw err;
		}
		
		var maxCount = 0;
		
		var hostSummaries = {};
		var averages = {inService : 0};
		for (var name in nrpeChecks) {
			for (var field in nrpeChecks[name].fields) {
				averages[field] = {sum : 0, count : 0};
			}
		}
	
		for (var r in results) {
			var response = results[r].response;
			
			for (var d in response.docs) {	// parse host results
			var doc = response.docs[d];
			var utc = moment.utc(doc.tickDate_dt);
			var host = doc['edge_s'];
	
			var hostSummary = hostSummaries[host];
			if (!hostSummary) {
				hostSummary = {errorWeight : 0, resultCount : 0};
				for (var name in nrpeChecks) {
					for (var field in nrpeChecks[name].fields) {
						hostSummary[field + 'Count'] = 0;
					}
				}
				hostSummaries[host] = hostSummary;
			}
	
			hostSummary['resultCount'] = hostSummary['resultCount'] + 1;
			if (hostSummary['resultCount'] > maxCount) {
				maxCount = hostSummary['resultCount'];
	        }
			if (doc.error_t) {
				var w = Math.round(moment().diff(doc['tickDate_dt']) / 10000);	// decreases based on time; recent is ~1400 - TERMINAL_ERROR
				if (verbose) {
					console.log(host + ': ' + doc.error_t.replace('CHECK_NRPE: ', '').trim() + ' ' + doc.tickDate_dt + ' errorWeight', w);
				}
					
				hostSummary.errorWeight = hostSummary.errorWeight + w;
			} else {
				for (var field in nrpeChecks[doc.aCheck_s].fields) {
					if (doc[field]) {
						hostSummary[field + 'Count'] = hostSummary[field + 'Count'] + doc[field];
						averages[field]['sum'] = averages[field]['sum'] + doc[field];
						averages[field]['count'] = averages[field]['count'] + 1;
					}
				}
			}
		}
	}
	
	for (var name in nrpeChecks) {
		for (var field in nrpeChecks[name].fields) {
			averages[field]['average'] = averages[field]['sum'] / averages[field]['count'];
		}
	}
	callback(null, { averages: averages, hostSummaries : hostSummaries});
	});
}

function mustComment() {
	if (!program.comment) {
		throw "You must enter a comment. use --help for help.";
	}
}

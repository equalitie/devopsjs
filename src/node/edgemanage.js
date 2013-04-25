#!/usr/bin/env node


/** Defaults **/
	
GLOBAL.MIN_HOSTS = 6;
GLOBAL.hostTestName = 'check_fail2ban';

var defaultUnits = 'hours';
var defaultPeriod = 10;
var TERMINAL_ERROR = 1400;
	

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
var hostsFile = configBase + 'hosts.json';

var fs = require('fs');
var utils = require('./lib/util.js');
var program = require('commander');
var queue = require('queue-async');
var moment = require('moment');
var solr = require('solr-client');
var solrClient = solr.createClient(GLOBAL.CONFIG.solrConfig);

program
  .option('-s --stats', 'current statistics')
  .option('-n, --online <host>', 'online from maintenance')
  .option('-f, --offline <host>', 'offline for maintenance')
  .option('-a, --activate <host>', ' make host active')
  .option('-d, --deactivate <host>', 'make host inactive')
  .option('-g, --advice [' + defaultPeriod + ']', 'rotation advice [10]')
  .option('-r, --rotate [' + defaultPeriod + ']', 'do auto-rotation [10]')
  .option('-t, --testhost <host>', 'live test host')
  .option('-q, --query <host>', 'query latest host test results')
  .option('-v --verbose', 'verbose output')
  .option('--del <host>', 'delete from configuration')
  .option('--add <host>', 'add to configuration')
  .option('--writeall <file>', 'write all hosts to a flat file')
  .option('-z, --zonegen', 'execute zongene script')
  .option('--override', 'override validation error')
  .option('-c, --comment <\'description\'>', 'comment for the action')
  .option('-i, --incident', 'file as an incident report');

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

if (program.stats) {
	console.log(getHostSummaries());
}

if (program.online) {
	mustComment();
	var hp = setOnline(program.online);
	writeHosts(hp.hosts);
	console.log(program.online + ' is now online');
}

if (program.offline) {
	mustComment();
	var hp = setOffline(program.offline);
	writeHosts(hp.hosts);
	console.log(program.offline + ' is now offline');
}

if (program.activate) {
	mustComment();
	var hp = activate(program.activate);
	writeHosts(hp.hosts);
	console.log(program.activate + ' is now active');
}

if (program.deactivate) {
	mustComment();
	var hp = deactivate(program.deactivate);
	writeHosts(hp.hosts);
	console.log(program.deactivate + ' is now inactive');
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

if (program.writeall) {
	var hp = getHosts();
	writeFlatHosts(hp.hosts, true, program.writeall);
}

/** argument processing **/

function setOnline(hostIn, hosts) {
	var hp = getHostFromHosts(hostIn, hosts);
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
	writeHosts(hp.hosts);
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
			console.log('addInactive', i + ' err: ' + hostSummaries[i].errorWeight, addInactive ? (host.inactive_dt + ' vs ' + addInactive.stats.inactive_dt + ': ' 
					+ (moment(host.inactive_dt).diff(addInactive.stats.inactive_dt))) : 'null');
		}
		if (!addInactive || (moment(host.inactive_dt).diff(addInactive.stats.inactive_dt) < 0)) {
			var rec = hostSummaries[i];

			if (rec.errorWeight < 1) {
				addInactive = { name : i, stats : host};
				if (verbose) {
					console.log("candidate", moment(removeActive.stats.inactive_dt).format("dddd, MMMM Do YYYY, h:mm:ss a"));
				}
			} else {
				if (!lowestError || rec.errorWeight < lowestError.errorWeight) {
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
	if (stats.active < GLOBAL.MIN_HOSTS) {
		throw "not enough available hosts; " + stats.active + ' (required: ' + GLOBAL.MIN_HOSTS + ')';
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
  return { total : total, active : active, activeHosts: activeHosts, inactive : inactive, inactiveHosts: inactiveHosts, available : available, unavailable : unavailable, offline : offline, offlineHosts: offlineHosts, required : GLOBAL.MIN_HOSTS};
}
	

/** get host and updated hosts. retrieves hosts if not passed. **/

function getHostFromHosts(hostIn, hosts) {
	if (!hosts) {
		hosts = require(hostsFile);
	}
	for (var h in hosts) {
		var host = hosts[h];
		if (host.name_s === hostIn) {
			return { hosts : hosts, host : host};
		}
	}
	throw "no such host: " + hostIn;
}

function writeHosts(hosts) {
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
	var now = new Date().toISOString();
	for (var i in hosts) {
		var host = hosts[i];
	
		var doc = {};
		for (var d in host) {
			if (host.hasOwnProperty(d)) {
				doc[d] = host[d];
			}
		}
			
		doc.date_dt = now;
		doc.class_s = 'host state';
		doc.id = host.name_s + '/' + now;
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
		var line = null;
		var host = hosts[h];
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

#!/usr/bin/env node

GLOBAL.MIN_HOSTS = 6;

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

var units = 'hours';
	
program
  .option('-s --stats', 'current statistics')
  .option('-a, --activate <edge>', ' make edge active')
  .option('-d, --deactivate <edge>', 'make edge inactive')
  .option('-r, --rotate [number]', 'do auto-rotation based on stats over num hours')
  .option('-g, --advice [number]', 'rotation advice based on stats over num hours')
  .option('-o, --offline <edge>', 'offline for maintenance')
  .option('-n, --online <edge>', 'online from maintenance')
  .option('-t, --testedge <edge>', 'query latest test results')
  .option('--del <edge>', 'delete from configuration')
  .option('--add <edge>', 'add to configuration')
  .option('--writeall <file>', 'write all hosts to a flat file')
  .option('-z, --zonegen', 'execute zongene script')
  .option('--override', 'override validation error')
  .option('-c, --comment <\'description\'>', 'comment for the action')
  .option('-i, --incident', 'file as an incident report');

/* argument processing **/
program.on('--help', function() {
  console.log('Commands can be chained, one per action. For example:');
  console.log('');
  console.log('    $ edgemanage -a edge1 -o edge2 -s -c \'replacing broken edge2 with edge1\'');
  console.log('');
  console.log('will make edge1 active, take edge2 offline, and print statistics.');
});

program.parse(process.argv);

if (!program.comment && !program.advice && !program.stats && !program.writeall && !program.testedge) {
	throw "You must enter a comment";
}

if (program.writeall) {
	var hosts = getHosts();
	writeFlatHosts(hosts, true, program.writeall);
}

if (program.testedge) {
	var check = require('./lib/nrpe/check.js');
	var testName = 'check_fail2ban';
	var test = require('./lib/nrpe/allchecks.js').getChecks(testName);

	check.checkEdge(program.testedge, test, testName, utils.getTick(), function(res) {
		console.log(res);
	});
}

if (program.activate) {
	activate(program.activate);
	console.log(program.activate + ' is now active');
}

if (program.deactivate) {
	deactivate(program.deactivate);
	console.log(program.deactivate + ' is now inactive');
}

if (program.online) {
	setOnline(program.online);
	console.log(program.online + ' is now online');
}

if (program.offline) {
	setOffline(program.offline);
	console.log(program.offline + ' is now offline');
}

if (program.advice) {
	advise(program.advice);
}

if (program.stats) {
	console.log(getHostStats());
}

/** argument processing **/

function setOnline(hostIn) {
	var hp = getHost(hostIn);
	var host = hp.host;

	if (!isOffline(host)) {
		throw "host is not offline";
	}
				
	host.active_b = false;
	host.online_dt = new Date().toISOString();
	host.comment_s = program.comment;
	_writeHosts(hp.hosts);
	writeFlatHosts(hp.hosts);
	return;
}

function setOffline(hostIn) {
	var hp = getHost(hostIn);
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is already offline";
	} else if (isActive(host)) {
		throw "host is already active";
	} else {
		host.active_b = false;
		host.offline_dt = new Date().toISOString();
		host.comment_s = program.comment;
		_writeHosts(hp.hosts);
		writeFlatHosts(hp.hosts);
	}
	return;
}

function deactivate(hostIn) {
	var hp = getHost(hostIn);
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is offline";
	} else if (isInactive(host)) {
		throw "host is already inactive";
	} else {
		host.active_b = false;
		host.inactive_dt = new Date().toISOString();
		host.comment_s = program.comment;
		_writeHosts(hp.hosts);
		writeFlatHosts(hp.hosts);
	}
	return;
}

function activate(hostIn) {
	var hp = getHost(hostIn);
	var host = hp.host;

	if (isOffline(host)) {
		throw "host is offline";
	} else if (isActive(host)) {
		throw "host is already online";
	} else {
		host.active_b = true;
		host.active_dt = new Date().toISOString();
		host.comment_s = program.comment;
		_writeHosts(hp.hosts);
		writeFlatHosts(hp.hosts);
	}
	return;
}

function advise(num) {
	var hosts = require(hostsFile);
	var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks();

	var solr = require('solr-client');
	var solrClient = solr.createClient(GLOBAL.CONFIG.solrConfig);
	var getStatsQueue = queue();
	var period = moment(moment() - moment().diff(num, units)).format() + 'Z'; // FIXME use Date.toISOString();
	for (var n in nrpeChecks) {
		for (var h in hosts) {
			var host = hosts[h].name_s;
		
			getStatsQueue.defer(function(callback) {
				var statsQuery = solrClient.createQuery()
					.q({edge_s : host, aCheck_s : n, tickDate_dt : '[' + period + ' TO NOW]'});

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
		var averages = {};
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
				if (doc['error_t']) {
					var w = moment(doc['tickDate_dt']).diff() / 10000;
					console.log('errorWeight', w);
					hostSummary['errorWeight'] = hostSummary['errorWeight'] + w;
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
		
		console.log(averages);
		/*
		for (var host in hostSummaries) {	// determine best host to rotate in, out
			var summary = hostSummaries[host];
			for (var k in hosts) {	if (hosts[k].name_s === host) { var rec = hosts[k]; } } // get host record
			['name_s', 'rotatedOut_b', 'offline_b'].forEach(function(f) { summary[f] = rec[f]; });
			console.log('HOST', host);
			var inScore = summary.errorWeight;
			var outScore = summary.errorWeight;
			if (rec.offline_b) {
				inScore = -1000;
				outScore = 1000;
			}
			if (rec.rotatedOut_b) {
				inScore += 500;
			}
			for (var c in hostSummaries) {
				var comp = hostSummaries[c];
				outScore += (summary.bytesPerSecond_iCount - comp.bytesPerSecond_iCount);
				outScore += (summary.sshBans_iCount - comp.bytesPerSecond_iCount) / 100;
				outScore += (summary.httpBans_iCount - comp.bytesPerSecond_iCount) / 100;
			}
			summary.outScore = outScore;
			summary.inScore = inScore;
		}

		var bestIn, bestOut;
		
		for (var host in hostSummaries) {
			var candidate = hostSummaries[host];
			for (v in hostSummaries) {
				var comp = hostSummaries[v];
				console.log('comparing', candidate, 'vs', comp, 'OUT', (candidate.outScore > comp.outScore), 'IN', (candidate.inScore > comp.inScore));
				if (candidate.outScore > comp.outScore) {
					bestOut = candidate;
				}
				if (candidate.inScore > comp.inScore) {
					bestIn = candidate;
				}
			}
		}
		
		console.log('bestIn', bestIn, 'bestOut', bestOut);*/
	});

// error_t
}

function validateConfiguration(hosts) {	// make sure the resulting config makes sense
	var stats = getHostStats(hosts);
	if (stats.active < GLOBAL.MIN_HOSTS) {
		throw "not enough available hosts; " + stats.active + ' (required: ' + GLOBAL.MIN_HOSTS + ')';
	}
}

function getHosts() {
	return require(hostsFile);
}


function getHostStats(hosts) {
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
		activeHosts[hosts[h].name_s] = { date : moment(host.active_dt).fromNow(), commment : hosts[h].comment_s };
	}
	if (isOffline(host)) {
		offline++;
		offlineHosts[hosts[h].name_s] = { date : moment(host.active_dt).fromNow(), comment : hosts[h].comment_s };
	} else if (isInactive(host)) {
		inactive++;
		inactiveHosts[hosts[h].name_s] = { date : moment(host.active_dt).fromNow(), comment : hosts[h].comment_s };
	}
  }
  return { total : total, active : active, activeHosts: activeHosts, inactive : inactive, inactiveHosts: inactiveHosts, available : available, unavailable : unavailable, offline : offline, offlineHosts: offlineHosts, required : GLOBAL.MIN_HOSTS};
}
	

/** utilities **/

function getHost(hostIn) {
	var hosts = require(hostsFile);
	for (var h in hosts) {
		var host = hosts[h];
		if (host.name_s === hostIn) {
			return { hosts : hosts, host : host};
		}
	}
	throw "no such host: " + hostIn;
}

function _writeHosts(hosts) {
	validateConfiguration(hosts);
	fs.writeFileSync(hostsFile, JSON.stringify(hosts, null, 2));
}

function writeFlatHosts(hosts, writeAll, file) {
	if (!file) {
		file = flatHostsFile;
		if (!file) {
			throw 'no flatHostsFile defined', flatHostsFile;
		}
	}

	var contents = writeAll ? '' : "# do not edit this file directly, use edgemanage instead\n";
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
	console.log('writing to', file);
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


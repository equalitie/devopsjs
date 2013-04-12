#!/usr/bin/env node

var utils = require('./lib/util.js');
var program = require('commander');
var queue = require('queue-async');
var moment = require('moment');

var units = 'hours';
	
program
  .option('-r, --rotate [number]', 'do auto rotation based on stats over num hours', Number, 4)
  .option('-c, --advice [number]', 'rotation advice based on stats over num hours', Number, 4)
  
  .option('-a, --activate <edge>', ' make edge active')
  .option('-d, --deactivate <edge>', 'make edge inactive')
  .option('-o, --out <edge>', 'remove for maintenance')
  .option('-i, --in <edge>', 'add from maintenance')
  .option('-t, --test <edge>', 'query latest test results')
  .option('--del <edge>', 'delete from configuration')
  .option('--add <edge>', 'add to configuration')

  .option('--override', 'override validation error')
  .option('-r, --reason \'description\'', 'reason for the action')
	.option('-i, --incident', 'file as an incident report')
  .parse(process.argv);

if (program.test) {
	var nrpe = require('./lib/nrpe/check.js');
	var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks()['fail2ban'];
	nrpe.checkEdge(program.test, nrpeChecks, utils.getTick(), function(res) {
		console.log(res);
		});
}

if (program.advice) {
	advise(program.advice);
}

function advise(num) {
	var hosts = require('../../config/hosts.json');
	require('../../config/localConfig.js');
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
						hostSummary[field + 'Count'] = hostSummary[field + 'Count'] + doc[field];
					}
				}
			}
		}
		for (var host in hostSummaries) {	// determine best host to rotate in, out using a scoring system
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
		
		console.log('bestIn', bestIn, 'bestOut', bestOut);
	});

// error_t
}

function validateConfiguration(hosts) {	// make sure the resulting config makes sense
	if (hosts.length < GLOBAL.MIN_HOSTS) {
		throw "not enough hosts; " + numHosts;
	}
}


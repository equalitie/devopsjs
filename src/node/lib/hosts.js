var fs = require('fs');
var utils = require('./util.js');
var queue = require('queue-async');
var moment = require('moment');
var colors = require('colors');
if (!process.stdout.isTTY) {
  colors.mode = 'none';
}

var solrClient;
var verbose = false;
var NOW = new Date().toISOString()

var config = { 
	hostTestName : 'check_fail2ban',
	defaultPeriod : 10,
	defaultUnits : 'hours',
	errorThreshold : 15000	// threshold for disqualified host
}
var worryVals = {OK : 0, WARNING : 5, CRITICAL : 20, UNKNOWN : 100, ERROR : 100};

/**
 * 
 * Host management module
 * 
 */

var hosts = {
  /** 
   * 
   * Set invocation configuration. You probably want to do this.
   * 
   */
  setConfig : function(program, hostsFile, store) {
    config.hostsFile = hostsFile;
    config.program = program;
    verbose = program.verbose;
    solrClient = store.createClient(GLOBAL.CONFIG.solrConfig);

    return this;
  },

  addHost : function(newHost, hosts) {
    var hp = getHostFromHosts(newHost, hosts);
    if (hp.host) {
      throw Error("host already exists: " + newHost, hosts);
    }

    var host = { name_s : newHost, added_dt : NOW, lastUpdate_dt : NOW, comment_s : config.program.comment};
    hp.hosts.push(host);
    hp.host = host;
    return hp;
  },

  /**
   * 
   * log the remove event with the callback
   * 
   */
  removeHost : function(remHost, hosts, writeCallback) {
    var hp = getHostFromHosts(remHost, hosts);
    if (!hp.host) {
      throw "host doesn't' exist: " + remHost;
    }
    hp.host.removed_dt = NOW;
    
    if (writeCallback) {
      writeCallback(hp);
    }
      
    var newHosts = [];
    for (var i in hp.hosts) {
      var host = hp.hosts[i];
      if (!(host.name_s === remHost)) {
        newHosts.push(host);
      }
    }
    hp.hosts = newHosts;
    hp.host = null;
    return hp;
  },

  setOnline : function(hostIn, hosts) {
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
    host.comment_s = config.program.comment;
    return hp;
  },

  setOffline : function(hostIn, hosts) {
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
    host.comment_s = config.program.comment;

    return hp;
  },

  activate : function(hostIn, hosts) {
    return activate(hostIn, hosts);
  },

  deactivate : function(hostIn, hosts) {
    return deactivate(hostIn, hosts);
  },

  advise : function(err, stats) {
    var advice = getRotateAdvice(stats, getHostsSummary());
    if (advice.removeActive === null || advice.addInactive === null) {
      throw "Can't advise" + JSON.stringify(advice);
    }
    if (advice.notTime) {
      console.log(advice.notTime.message);
      process.exit(1);
    } else { 
      console.log(process.argv[1] + ' --activate ' + advice.addInactive.name + ' --deactivate ' + advice.removeActive.name + ' -c "' + advice.summary + '"'); 
    }
  },

  rotate : function(err, stats) {
    var advice = getRotateAdvice(stats, getHostsSummary());
    if (advice.removeActive === null || advice.addInactive === null) {
      throw "Can't rotate" + JSON.stringify(advice);
    }
    if (advice.notTime) {
      console.log(advice.notTime.message);
      process.exit(1);
    } else { 
      
      var hp = activate(advice.addInactive.name);
      hp = deactivate(advice.removeActive.name, hp.hosts);
      writeHosts(hp.hosts);	// FIXME: move storage to higher level
      console.log(advice.summary);
   }
  },

  getStats : function(num, callback) {
    num = 0 + parseInt(num);
    
    var hosts = require(config.hostsFile);
    var nrpeChecks = require('./nrpe/allchecks.js').getChecks();
    
    var getStatsQueue = queue();
    var period = moment(moment() - moment().diff(num, config.defaultUnits)).format() + 'Z'; // FIXME use Date.toISOString();

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
      
      callback(null, getHostStats(results, nrpeChecks));
    });
  }, 

  writeHosts : function(hosts, changedHost) {
    return writeHosts(hosts, changedHost);
  },

  getHostsSummary : function() {
    return getHostsSummary();
  },

  getHosts : function() {
    return getHosts();
  }, 

  writeHostsJson : function(hosts) {
    return writeHostsJson(hosts);
  },
  getRotateAdvice : function(stats, hosts) {
    return getRotateAdvice(stats, hosts);
  }
}

hosts.config = config;

module.exports = hosts;

/**
**	Implementations
**
**/
	
/**
 * Generate stats for edges
 *
 * @param {results} array of Solr edge queries
 * @param {nrpeChecks} checks used for these edges from lib/nrpe/allChecks.js
 * @return {Object} hostSummaries
 * @api private
 */

function getHostStats(results, nrpeChecks) {
  var hostStats = {}, maxCount = 0;
  for (var r in results) {
    var response = results[r].response;
    
    for (var d in response.docs) {	// parse host results
      var doc = response.docs[d];
      var status = doc.status_s, utc = moment.utc(doc.tickDate_dt), host = doc['edge_s'], hostStat = hostStats[host];
      if (!hostStat) {
        hostStat = {worryWeight : 0, resultCount : 0, worries: []};
        for (var name in nrpeChecks) {
          for (var field in nrpeChecks[name].fields) {
            hostStat[field + 'Count'] = 0;
          }
        }
        hostStats[host] = hostStat;
      }
  
      hostStat['resultCount'] = hostStat['resultCount'] + 1;
      if (hostStat['resultCount'] > maxCount) {
        maxCount = hostStat['resultCount'];
      }
      var msg = status, worry = 0, timeAgo = moment(doc['tickDate_dt']).fromNow(), timeWeight = Math.round(10000/((moment().diff(doc.tickDate_dt) / 10000)/2)); // decrease over time
      if (doc.error_t) {
        msg = doc.error_t.replace('CHECK_NRPE: ', '').trim();
      }
      if (status != 'OK' && !worryVals[status]) {
        throw 'Missing worryVal for "' + status + '"';
      }

      if (worryVals[status] > 0) {
        worry = worryVals[status] * timeWeight;
        hostStat.worries.push({status_s : status, weight: worry});
      }
      hostStat.worryWeight = hostStat.worryWeight + worry;
      if (verbose) {
        console.log(host.yellow + ' ' + doc.aCheck_s.replace('check_', '') + ' from ' + timeAgo + ': ' + msg + '(' +worryVals[status] + ') *' , 'timeWeight(' + timeWeight + ') =', worry, '∑', hostStat.worryWeight);
      }
    }
	}
	
  return hostStats;
}

/**
*
* Get rotation advice based on recent histories of hosts.
*
*/

function getRotateAdvice(hostSummaries, hosts) {

	if (hosts.inactiveHosts < 1) {
		throw 'no inactive hosts to rotate with';
	}
	
  var activeAdvice = getRemoveActive(hosts, hostSummaries);
  var inactiveAdvice = getAddInactive(hosts, hostSummaries);
	
	if (config.program.rin && !inactiveAdvice.host) {
		throw "Can't rotate in " + program.rin;
	}
	
	if (config.program.rout && !activeAdvice.host) {
		throw "Can't rotate out " + config.program.rout;
	}
	
	if (!activeAdvice.host) {
		throw "no host to inactivate";
	}
	
	if (!inactiveAdvice.host) {
		throw "no host to activate";
	}
	
	var ret = {removeActive : activeAdvice.host , addInactive : inactiveAdvice.host
    , removeReason : activeAdvice.reason , addReason : inactiveAdvice.reason
		, summary : 'replace ' + activeAdvice.host.name + ' ' + activeAdvice.host.stats.since +  ' [' + activeAdvice.reason + '] w ' + inactiveAdvice.host.name + ' ' + inactiveAdvice.host.stats.since + ' [' + inactiveAdvice.reason + ']'};

  if (!GLOBAL.CONFIG.rotationTimeMinutes) {
    throw ("GLOBAL.CONFIG.rotationTimeMinutes not defined");
  }
  var diff = moment().diff(moment(activeAdvice.host.stats.active_dt), 'minutes');
  if ((activeAdvice.host.stats.worry < 1) && (diff < GLOBAL.CONFIG.rotationTimeMinutes)) {
    ret.notTime = { message: 'no rotationTimeMinutes requirement to rotate (config ' + GLOBAL.CONFIG.rotationTimeMinutes + ' vs ' + diff + ' minutes)'};
  }
  return ret;
}

function getAddInactive(hosts, hostSummaries) {
  var addReason, addInactive;
	var tries = hosts.inactive;
	var lowestError = null;	// use this host if no other option
	
	for (var i in hosts.inactiveHosts) { // get oldest inactive host to activate
		var host = hosts.inactiveHosts[i];
		if (config.program.rin) {
			if (config.program.rin === i) {
				addInactive = { name : i, stats : host};
				addReason = 'request in';
			}
		} else {
		
			if (verbose) {
				if (!hostSummaries[i]) {
					console.log('addInactive eval'.yellow, i + ' no reports');
				} else {
					console.log('addInactive eval'.yellow, i + ' worry: '.red + hostSummaries[i].worryWeight, addInactive ? (host.inactive_dt + ' vs ' + addInactive.stats.inactive_dt + ': ' 
						+ Math.round(moment(host.inactive_dt).diff(addInactive.stats.inactive_dt)/10000)) : 'initial');
				}
			}
			if (!addInactive || (moment(host.inactive_dt).diff(addInactive.stats.inactive_dt) < 0)) {
				var rec = hostSummaries[i];
	
				if (rec && rec.worryWeight < 1) { // it has had reports and they are perfect
					addInactive = { name : i, stats : host};
					addReason = 'time';
					if (verbose) {
						console.log("add candidate; time: ".green, moment(addInactive.stats.inactive_dt).format("dddd, MMMM Do YYYY, h:mm:ss a"));
					}
				} else {
					if (!lowestError || (rec && rec.worryWeight < lowestError.worryWeight)) {	// it has had reports and they are not the worst
						if (verbose) {
							console.log('lowest errored host:'.yellow, rec ? rec.worryWeight : 'no records');
						}
							
						lowestError = i;
					}
				}
			}
		}
	}
	
	if (!addInactive && lowestError && lowestError.worryWeight < config.errorThreshold) {
		addReason = 'lowest error';
		addInactive = { name : lowestError, stats : hosts.inactiveHosts[lowestError]};
	}
  return { host : addInactive, reason: addReason};
}

function getRemoveActive(hosts, hostSummaries) {
  var removeActive, removeReason;
	var highestError = null;
	for (var i in hosts.activeHosts) { // get oldest or most problematic active host to deactivate
		var host = hosts.activeHosts[i];
    host.worry = 0 + hostSummaries[i].worryWeight;
		if (config.program.rout) {
			if (config.program.rout === i) {
				removeActive = { name : i, stats : host};
				removeReason = 'request out';
			}
		} else {
			if (verbose) {
				console.log('removeActive eval'.yellow, i, ' worry: '.red + hostSummaries[i].worryWeight, removeActive ? (host.active_dt + ' vs ' + removeActive.stats.active_dt + ': ' 
						+ Math.round(moment(host.active_dt).diff(removeActive.stats.active_dt)/10000)) : 'initial');
			}
			var rec = hostSummaries[i];
			
			if (rec && rec.worryWeight > 0 && (!highestError || rec.worryWeight > highestError.worryWeight)) {	// remove edge with highest error
				removeActive = { name : i, stats : host};
				highestError = rec;
				removeReason = 'worry (' + rec.worryWeight + ')';
				if (verbose) {
					console.log('remove candidate; worry:'.blue, rec.worryWeight);
				}
			} else if (!highestError && (!removeActive || (moment(host.active_dt).diff(removeActive.stats.active_dt) < 0))) {	// or if no errors, longest time
				removeActive = { name : i, stats : host};
				removeReason = 'time';
				if (verbose) {
					console.log('remove candidate; time:'.blue, moment(removeActive.stats.active_dt).format("dddd, MMMM Do YYYY, h:mm:ss a"));
				}
			}
		}
	}
  return { host : removeActive, reason : removeReason };
}
	
function getHostsSummary(hosts) {
  if (!hosts) {
	hosts = require(config.hostsFile);
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
  return { total : total, active : active, activeHosts: activeHosts, inactive : inactive, inactiveHosts: inactiveHosts, available : available, unavailable : unavailable, offline : offline, offlineHosts: offlineHosts, required : GLOBAL.CONFIG.minActive};
}

function validateConfiguration(hosts) {	// make sure the resulting config makes sense
	var stats = getHostsSummary(hosts);
	if (stats.active < GLOBAL.CONFIG.minActive) {
		if (program.override) {
			console.log("overridding required hosts");
		} else {
			throw "not enough active hosts; " + stats.active + ' (required: ' + GLOBAL.CONFIG.minActive + ')';
		}
	}
	if (GLOBAL.CONFIG.constantActive && stats.active != GLOBAL.CONFIG.constantActive) {
		if (program.override) {
			console.log("overridding required constant active");
		} else {
			throw "active hosts not required number; " + stats.active + ' (required: ' + GLOBAL.CONFIG.constantActive + ')';
		}
	}
	if (GLOBAL.CONFIG.minInactive  && stats.inactive < GLOBAL.CONFIG.minInactive) {
		if (program.override) {
			console.log("overridding required inactive");
		} else {
			throw "not enough inactive hosts; " + stats.inactive + ' (required: ' + GLOBAL.CONFIG.minInactive + ')';
		}
	}
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
	host.comment_s = config.program.comment;
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
	host.comment_s = config.program.comment;
	return hp;
}
	
/**
 * 
 * Utilities
 * 
 */

function getHosts() {
	return require(config.hostsFile);
}

/** 
* get host and updated hosts. retrieves hosts if not passed.  
**/

function getHostFromHosts(hostIn, hosts) {
	if (!hosts) {
		try {
			hosts = require(config.hostsFile);
		} catch (e) {
			throw 'can\'t require ' + config.hostsFile + ' from ' + process.cwd();
		}
		
	}
	for (var h in hosts) {
		var host = hosts[h];
		if (host.name_s === hostIn) {
			return { hosts : hosts, host : host, position: h};
		}
	}
	return { hosts : hosts};
}

function writeHostsJson(hosts) {
  fs.writeFileSync(config.hostsFile, JSON.stringify(hosts, null, 2));
}

function writeHosts(hosts, changedHost) {
	validateConfiguration(hosts);
	
	writeHostsJson(hosts);
	if (config.flatHostsFile) {
		if (verbose) {
			console.log('writing to ' + config.flatHostsFile);
		}
		writeFlatHosts(hosts);
	}
	
	var sum = getHostsSummary(hosts);
	var summary = {comment_s : config.program.comment, operator_s : process.env.SUDO_USER || process.env.USER
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

/**
 * 
 * Host is eligble to be active
 * 
 */

function isAvailable(host) {
	return (!isOffline(host));
}

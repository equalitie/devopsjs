var fs = require('fs');
var utils = require('./util.js');
var queue = require('queue-async');
var moment = require('moment');
var colors = require('colors');
if (!process.stdout.isTTY) {
  colors.mode = 'none';
}

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
  setConfig : function(program, hostsFile) {
    config.hostsFile = hostsFile;
    config.program = program;
    verbose = program.verbose;

    return this;
  },

  addHost : function(newHost, hosts) {
    var hp = getHostFromHosts(newHost, hosts);
    if (hp.host) {
      throw Error("host already exists: " + newHost, hosts);
    }

    var host = { hostname : newHost, added : NOW, comment : config.program.comment};
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
    hp.host.removed = NOW;
    
    if (writeCallback) {
      writeCallback(hp);
    }
      
    var newHosts = [];
    for (var i in hp.hosts) {
      var host = hp.hosts[i];
      if (!(host.hostname === remHost)) {
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
          
    host.state = 'inactive';
    host.lastOnline = new Date().toISOString();
    host.comment = config.program.comment;
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
    
    host.state = 'offline';
    host.lastOffline = new Date().toISOString();
    host.comment = config.program.comment;

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
    
    var qchecks = [], qhosts = [];
    for (var n in nrpeChecks) {
      qchecks.push(n);
    }
      
    for (var h in hosts) {
      qhosts.push(hosts[h].hostname);
    }
    var q = { 
      size : 500,
      "query": { 
        "filtered": { 
          "query": { 
            "bool": { 
              "must": [
                  {
                    "match" : { "checkName" : qchecks.join(' ') }
                  },
                  {
                    "match" : { "hostname" : qhosts.join(' ') }
                  }
              ]
            } 
          }, 
          "filter": {
            "range": { 
              "@timestamp": { 
                "gt": "now-9m" 
              } 
            } 
          } 
        } 
      } 
    }

    GLOBAL.CONFIG.getStore().search({ _index : 'devopsjs', _type : 'hostCheck'}, q, function(err, res) {
      if (err) {throw err; }
      callback(null, getHostStats(res.hits.hits, nrpeChecks));
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
 * @param {results} array of edge queries
 * @param {nrpeChecks} checks used for these edges from lib/nrpe/allChecks.js
 * @return {Object} hostSummaries
 * @api private
 */

function getHostStats(results, nrpeChecks) {
  var hostStats = {}, maxCount = 0;
  for (var d in results) {	// parse host results
    var doc = results[d]._source;
    var status = doc.status, utc = moment.utc(doc['@timestamp']), host = doc['hostname'], hostStat = hostStats[host];
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
    var msg = status, worry = 0, timeAgo = moment(doc['@timestamp']).fromNow(), timeWeight = Math.round(10000/((moment().diff(doc['@timestamp']) / 10000)/2)); // decrease over time
    if (doc.error) {
      msg = doc.error.replace('CHECK_NRPE: ', '').trim();
    }
    if (status != 'OK' && !worryVals[status]) {
      throw 'Missing worryVal for "' + status + '"';
    }

    if (worryVals[status] > 0) {
      worry = worryVals[status] * timeWeight;
      hostStat.worries.push({state : status, weight: worry});
    }
    hostStat.worryWeight = hostStat.worryWeight + worry;
    if (verbose) {
      console.log(host.yellow + ' ' + doc.checkName.replace('check_', '') + ' from ' + timeAgo + ': ' + msg + '(' +worryVals[status] + ') *' , 'timeWeight(' + timeWeight + ') =', worry, '∑', hostStat.worryWeight);
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
		throw "Can't rotate in " + config.program.rin;
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

	var ret = {newest: activeAdvice.newest, removeActive : activeAdvice.host , addInactive : inactiveAdvice.host
    , removeReason : activeAdvice.reason , addReason : inactiveAdvice.reason
		, summary : 'replace ' + activeAdvice.host.name + ' ' + activeAdvice.host.stats.since +  ' [' + activeAdvice.reason + '] w ' + inactiveAdvice.host.name + ' ' + inactiveAdvice.host.stats.since + ' [' + inactiveAdvice.reason + ']'};

  /** Should we rotate even if it's not time **/
  var doRotate = config.program.rout || config.program.rin || config.program.override || activeAdvice.host.stats.worry > 0;
	
  if (!doRotate) {
    if (!GLOBAL.CONFIG.rotationTimeMinutes) {
      throw ("GLOBAL.CONFIG.rotationTimeMinutes not defined");
    }
    var diff = moment().diff(moment(activeAdvice.newest.stats.lastActive), 'minutes');
    if (diff < GLOBAL.CONFIG.rotationTimeMinutes) {
      ret.notTime = { message: 'no rotationTimeMinutes requirement to rotate (config ' + GLOBAL.CONFIG.rotationTimeMinutes + ' vs ' + diff + ' minutes)'};
    }
  }
  return ret;
}

function getAddInactive(hosts, hostSummaries) {
  var addReason, addInactive, tries = hosts.inactive,
	  lowestError = null;	// use this host if no other option
	
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
					console.log('addInactive eval'.yellow, i + ' worry: '.red + hostSummaries[i].worryWeight, addInactive ? (host.lastInactive + ' vs ' + addInactive.stats.lastInactive + ': ' 
						+ Math.round(moment(host.lastInactive).diff(addInactive.stats.lastInactive)/10000)) : 'initial');
				}
			}
			if (!addInactive || (moment(host.lastInactive).diff(addInactive.stats.lastInactive) < 0)) {
				var rec = hostSummaries[i];
	
				if (rec && rec.worryWeight < 1) { // it has had reports and they are perfect
					addInactive = { name : i, stats : host};
					addReason = 'time';
					if (verbose) {
						console.log("add candidate; time: ".green, moment(addInactive.stats.lastInactive).format("dddd, MMMM Do YYYY, h:mm:ss a"));
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
  var removeActive, removeReason, newest, highestError = null;
	for (var i in hosts.activeHosts) { // get oldest or most problematic active host to deactivate
		var host = hosts.activeHosts[i];
    host.worry = hostSummaries[i] ? hostSummaries[i].worryWeight : config.errorThreshold; // if host doesn't have records it's a worry
		if (config.program.rout) {
			if (config.program.rout === i) {
				removeActive = { name : i, stats : host};
				removeReason = 'request out';
			}
		} else {
			if (verbose) {
				console.log('removeActive eval'.yellow, i, ' worry: '.red + host.worry, removeActive ? (host.lastActive + ' vs ' + removeActive.stats.lastActive + ': ' 
						+ Math.round(moment(host.lastActive).diff(removeActive.stats.lastActive)/10000)) : 'initial');
			}
			var rec = hostSummaries[i];
			
			if (rec && rec.worryWeight > 0 && (!highestError || rec.worryWeight > highestError.worryWeight)) {	/** remove edge with highest error **/
				removeActive = { name : i, stats : host};
				highestError = rec;
				removeReason = 'worry (' + rec.worryWeight + ')';
				if (verbose) {
					console.log('remove candidate; worry:'.blue, rec.worryWeight);
				}
			} else if (!highestError && (!removeActive || (moment(host.lastActive).diff(removeActive.stats.lastActive) < 0))) {	/** or if no errors, longest time **/
				removeActive = { name : i, stats : host};
				removeReason = 'time';
				if (verbose) {
					console.log('remove candidate; time:'.blue, moment(removeActive.stats.lastActive).format("dddd, MMMM Do YYYY, h:mm:ss a"));
				}
			} else if (!newest || moment(host.lastActive).diff(newest.stats.lastActive) > 0) {	/** log the newest rotated **/
				newest = { name : i, stats : host};
			}
		}
	}
  return { host : removeActive, reason : removeReason, newest: newest };
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
		activeHosts[hosts[h].hostname] = { lastActive : host.lastActive, since : moment(host.lastActive).fromNow(), commment : hosts[h].comment };
	}
	if (isOffline(host)) {
		offline++;
		offlineHosts[hosts[h].hostname] = { lastOffline : host.lastOffline, since : moment(host.lastOffline).fromNow(), comment : hosts[h].comment };
	} else if (isInactive(host)) {
		inactive++;
		inactiveHosts[hosts[h].hostname] = { lastInactive : host.lastInactive, since : moment(host.lastInactive).fromNow(), comment : hosts[h].comment };
	}
  }
  return { total : total, active : active, activeHosts: activeHosts, inactive : inactive, inactiveHosts: inactiveHosts, available : available, unavailable : unavailable, offline : offline, offlineHosts: offlineHosts, required : GLOBAL.CONFIG.minActive};
}

function validateConfiguration(hosts) {	// make sure the resulting config makes sense
	var stats = getHostsSummary(hosts);
	if (stats.active < GLOBAL.CONFIG.minActive) {
		if (config.program.override) {
			console.log("overridding required hosts");
		} else {
			throw "not enough active hosts; " + stats.active + ' (required: ' + GLOBAL.CONFIG.minActive + ')';
		}
	}
	if (GLOBAL.CONFIG.constantActive && stats.active != GLOBAL.CONFIG.constantActive) {
		if (config.program.override) {
			console.log("overridding required constant active");
		} else {
			throw "active hosts not required number; " + stats.active + ' (required: ' + GLOBAL.CONFIG.constantActive + ')';
		}
	}
	if (GLOBAL.CONFIG.minInactive  && stats.inactive < GLOBAL.CONFIG.minInactive) {
		if (config.program.override) {
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
  host.state = 'active';
	host.lastActive = new Date().toISOString();
	host.comment = config.program.comment;
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
	
	host.state = 'inactive';
	host.lastInactive = new Date().toISOString();
	host.comment = config.program.comment;
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
		if (host.hostname === hostIn) {
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
	if (GLOBAL.CONFIG.flatHostsFile) {
		if (verbose) {
			console.log('writing to ' + GLOBAL.CONFIG.flatHostsFile);
		}
		writeFlatHosts(hosts, false, GLOBAL.CONFIG.flatHostsFile);
	} else {
    if (verbose) {
      console.log('no flatHostsFile defined');
    }
  }
	
	var sum = getHostsSummary(hosts);
	var summary = {comment : config.program.comment, operator : process.env.SUDO_USER || process.env.USER
       , lastActive: sum.active, lastInactive: sum.inactive, lastOffline: sum.offline
       , '@timestamp' : NOW, 'program': config.program};
	GLOBAL.CONFIG.getStore().index({_index : 'devopsjs', _type : 'edgeManage'}, summary, function(err,obj){
	  if(err){
	    throw "commit ERROR: " + err;
	  }
	});
    
  var docs = [];
	for (var i in hosts) {
		var host = hosts[i];
		if (changedHost && !changedHost == host.hostname) {
			continue;
		}
		
		var doc = {};
		for (var d in host) {
			if (host.hasOwnProperty(d)) {
				doc[d] = host[d];
			}
		}
			
		doc['@timestamp'] = NOW;
		doc.id = host.hostname + '/' + NOW;
		docs.push(doc);
	}
	GLOBAL.CONFIG.getStore().index({_index : 'devopsjs', _type : 'hostSummary'}, docs, function(err,obj){
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
		var name = host.hostname;
		if (isActive(host) || writeAll) {
			line = name;
		} else if (isOffline(host)) {
			line = '# ' + host.comment + '\n#' + name;
		} else { // inactive
			line = '## ' + name;
		}
		contents += line + '\n';		
	}
	fs.writeFileSync(file, contents);
}

function isInactive(host) {
	return host.state == 'inactive';
}

function isActive(host) {
	return host.state == 'active';
}

function isOffline(host) {
	return host.state == 'offline';
}

/**
 * 
 * Host is eligble to be active
 * 
 */

function isAvailable(host) {
	return (!isOffline(host));
}

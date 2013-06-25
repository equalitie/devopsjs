GLOBAL.exception = function(s) {
	console.log('*** EXCEPTION', s);
}

var util=require('./lib/util.js')
var program = require('commander');
var queue = require('queue-async');
var hostLib = require('./lib/hosts.js');
var fs = require('fs');

var configBase;
if (process.env.DEVOPSCONFIG) {
  configBase = process.env.DEVOPSCONFIG;
} else {
  configBase = process.cwd() + '/config/';
}

var hosts = require(configBase + 'hosts.json');
require(configBase + 'localConfig.js');

var store = require('./lib/solrNagios.js');
var nrpe = require('./lib/nrpe/check.js');

var tick = util.getTick();
var numChecks = 0;

program
  .option('-c, --check <regex>', 'only execute checks that match this regex')
  .option('-h, --host <host>', 'only check this host')
  .option('-s --save', 'write results (defaults to no if a check or host is specified')
  .parse(process.argv);

var verbose = program.verbose === true;

hostLib = hostLib.setConfig(program, configBase + 'hosts.json', verbose, require('solr-client'));
var doResolve = true; // resolve edge's current cluster
var doSave = program.save || (!program.check && !program.host);
var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks(program.check ? program.check : null);

for (var key in nrpeChecks) {
    if (nrpeChecks.hasOwnProperty(key)) { numChecks++; }
}

var docs = [];

// only include one host
if (program.host) {
	var onlyEdge = program.host;
	var newHosts = [];
	for (var i in hosts) {
		var host = hosts[i];
		if (host.name_s === onlyEdge) {
			newHosts.push(host);
		}
	}
	
	if (!newHosts.length == 1) {
		throw "'" + onlyEdge + "' not found ";
	}
	hosts = newHosts;
}
if (numChecks < 1) {
	throw "No checks";
} else if (hosts.length < 1) {
	throw "No hosts";
}

if (doSave) {
  if (doResolve) {
    var bareHosts = [];
    hosts.forEach(function(h) { bareHosts.push(h.name_s); });
    var nom = require('./lib/nomination.js');
    nom.resolve(bareHosts, GLOBAL.CONFIG.dnets, function(r) {
      var resolved = {};
      hosts.forEach(function(host) {
        resolved[host.name_s] = nom.getConfig(host.name_s);
      });
 	    commitEdgeSummary(hosts, tick, store, resolved);
    });
  } else {
 	  commitEdgeSummary(hosts, tick, store);
  }
}

for (var checkName in nrpeChecks) {
	for (var i = 0; i < hosts.length; i++) {
		var res = nrpe.checkEdge(hosts[i].name_s, nrpeChecks[checkName], checkName, tick, function(res) {
			if (doSave) {
				addResult(res);
			} else {
				console.log(res);
			}
		});
	}
}

function addResult(doc) {
  docs.push(doc);
  if (docs.length == (numChecks * hosts.length)) {
    store.commit(docs);
  }
}

function commitEdgeSummary(hosts, tick, store, resolved) {
  var hostSummary = [];
  
  for (var i = 0; i < hosts.length; i++) {
    var host = hosts[i];
    var lookup = resolved ? resolved[host.name_s] || 'none' : '';
    if (lookup && GLOBAL.CONFIG.domain) {
      lookup = lookup.replace(GLOBAL.CONFIG.domain, '');
    }
    if (lookup !== host.dnet_s) {
      host.dnet_s = lookup;
      host.dnetChange_dt = tick.tickDate;
    }
    hostSummary.push({id: host.name_s + "/" + tick.tickTime, class_s: 'host summary', name_s: host.name_s, dnet_s: lookup, rotatedOut_s: host.rotatedOut, offline_s: host.offline, tickDate_dt : tick.tickDate});
  }
  store.commit(hostSummary);
  hostLib.writeHostsJson(hosts);
}


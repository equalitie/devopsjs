'use strict';

GLOBAL.exception = function(s) {
	console.log('*** EXCEPTION', s);
}

var program = require('commander');
var hostLib = require('./lib/hosts.js');

var utils = require('./lib/util.js');
utils.config();

var hosts = require(GLOBAL.CONFIG.configBase + 'hosts.json');

var store = GLOBAL.CONFIG.getStore();
var nrpe = require('./lib/nrpe/check.js');

var tick = utils.getTick();
var numChecks = 0;

program
  .option('-c, --check <regex>', 'only execute checks that match this regex')
  .option('-h, --host <host>', 'only check this host')
  .option('-v, --verbose', 'verbose')
  .option('-s --save', 'write results (defaults to no if a check or host is specified')
  .parse(process.argv);

hostLib = hostLib.setConfig(program, GLOBAL.CONFIG.configBase+ 'hosts.json');
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
		if (host.hostname === onlyEdge) {
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
    hosts.forEach(function(h) { bareHosts.push(h.hostname); });
    var nom = require('./lib/nomination.js');
    nom.resolve(bareHosts, GLOBAL.CONFIG.dnets, function(resolved) {
 	    commitEdgeSummary(hosts, tick, store, nom);
    });
  } else {
 	  commitEdgeSummary(hosts, tick, store);
  }
}

for (var checkName in nrpeChecks) {
	for (var i = 0; i < hosts.length; i++) {
		var res = nrpe.checkHost(hosts[i].hostname, nrpeChecks[checkName], checkName, tick, function(res) {
			if (doSave) {
        docs.push(res);
        if (docs.length == (numChecks * hosts.length)) {
          store.index({_index : 'devopsjs', _type : 'hostCheck', refresh : true}, docs);
        }
			} else {
				console.log(res);
			}
		});
	}
}

function commitEdgeSummary(hosts, tick, store, nom) {
  var hostSummary = [];
  
  for (var i = 0; i < hosts.length; i++) {
    var host = hosts[i];
    var h = host.hostname;
    var lookup = 'unknown';
    if (nom) {
      var g = nom.getGeo(h);
      if (g) {
        host.lonlat = g.lonlat;
        host.countryCode = g.country_code;
      }
      lookup = nom.getDnet(h) || 'none'; 
      if (GLOBAL.CONFIG.domain) {
        lookup = lookup.replace(GLOBAL.CONFIG.domain, '');
      }
      if (lookup != host.dnet) {
        host.dnet = lookup;
        host.dnetChange = tick.tickDate;
      }
    }
    hostSummary.push({id: host.hostname + "/" + tick.tickTime, hostname: host.hostname, dnet: lookup, dnetChange : host.dnetChange, '@timestamp' : tick.tickDate, lonlat: host.lonlat, countryCode: host.countryCode});
  }
  store.index({_index : 'devopsjs', _type : 'checkSummary'}, hostSummary);
  hostLib.writeHostsJson(hosts);
}


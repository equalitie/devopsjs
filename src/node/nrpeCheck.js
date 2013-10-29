/*jslint node: true */

'use strict';

GLOBAL.exception = function(s) {
  console.log('*** EXCEPTION', s);
};

var program = require('commander');
var utils = require('./lib/util.js');
utils.config();
var hostLib = require('./lib/hosts.js');
hostLib = hostLib.setConfig(program, 'MERGED');


var hosts = require(GLOBAL.CONFIG.configBase + 'hosts.json');

var store = GLOBAL.CONFIG.getStore();
var nrpe = require('./lib/nrpe/check.js');

var tick = utils.getTick();
var numChecks = 0;
var docs = [];

program
  .option('-c, --check <regex>', 'only execute checks that match this regex')
  .option('-h, --host <host>', 'only check this host')
  .option('-v, --verbose', 'verbose')
  .option('-s --save', 'write results (defaults to no if a check or host is specified')
  .parse(process.argv);

var hosts = mergeDNETs();

var doResolve = true; // resolve edge's current cluster
var doSave = program.save || (!program.check && !program.host);
var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks(program.check ? program.check : null);

for (var key in nrpeChecks) {
  if (nrpeChecks.hasOwnProperty(key)) { numChecks++; }
}

// only include one host?
if (program.host) {
  var onlyEdge = program.host;
  var newHosts = [];
  for (var i in hosts) {
    var host = hosts[i];
    if (host.hostname === onlyEdge) {
      newHosts.push(host);
      if (program.verbose) {
        console.log('adding', host);
      }
    }
  }
  
  if (newHosts.length !== 1) {
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
    if (program.verbose) { console.log('resolving');}
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
    var res = nrpe.checkHost(hosts[i].hostname, nrpeChecks[checkName], checkName, tick, processCheck) ;
  }
}

/** Merge dnets for processing **/

function mergeDNETs() {
  try {
    var merged = hostLib.getDNET('MERGED');
  } catch (e){
    if (program.verbose) { console.log('no existing merged dnets'); }
    merged = [];
  }

  var hosts = [];
  GLOBAL.CONFIG.dnets.forEach(function(dnetName) {
    var name = dnetName.replace(GLOBAL.CONFIG.domain, '');
    var dnet = hostLib.getDNET(name);
    dnet.forEach(function(d) { 
      d.DNET = name; 
      merged.forEach(function(m) {  // copy interesting properties from last iteration
        if (m.hostname === d.hostname) { 
          d.lastDNET = m.lastDNET; 
          d.lastDNETChange = m.lastDNETChange;
        } 
      });
    });
    hosts = hosts.concat(dnet);
  });
  return hosts;
}

function processCheck(res) {
  if (doSave) {
    docs.push(res);
    if (docs.length == (numChecks * hosts.length)) {
      store.index({_index : 'devopsjs', _type : 'hostCheck', refresh : true}, docs);
    }
  } else {
    console.log(res);
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
      host.ipv4 = nom.getHostIP(h);
      if (lookup != host.lastDNET) {
        host.lastDNET = lookup;
        host.lastDNETChange = tick.tickDate;
        if (program.verbose) { console.log(h, 'dnet change to', lookup); }
      }
    }
    hostSummary.push({hostname: host.hostname, dnet: lookup, dnetChange : host.dnetChange, '@timestamp' : tick.tickDate, lonlat: host.lonlat, countryCode: host.countryCode});
  }
  store.index({_index : 'devopsjs', _type : 'checkSummary'}, hostSummary);
  hostLib.writeHostsJson(hosts);
}


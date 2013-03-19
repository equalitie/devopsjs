
var util=require('./lib/util.js')
var hosts = require('../../config/hosts.json');
var store = require('./lib/solrNagios.js');
var nrpe = require('./lib/nrpe/check.js');
var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks();
var tick = util.getTick();

var docs = [];

// only include one host
if (process.argv.length == 3) {
	var onlyEdge = process.argv[2];
	var newHosts;
	for (var i = 0; i < hosts.length; i++) {
		if (hosts[i].name === onlyEdge) {
			newHosts = [hosts[i]];
		}
	}
	if (!newHosts) {
		throw "'" + onlyEdge + "' not found";
	}
	hosts = newHosts;
}
if (nrpeChecks.length < 1) {
	throw "No checks";
} else if (hosts.length < 1) {
	throw "No hosts";
}

commitEdgeSummary(hosts, tick, store);

for (var j = 0; j < nrpeChecks.length; j++) {
	for (var i = 0; i < hosts.length; i++) {
		var res = nrpe.checkEdge(hosts[i].name, nrpeChecks[j], tick, function(res) {
			addResult(res);
		});
	}
}

function addResult(doc) {
  docs.push(doc);
  if (docs.length == (nrpeChecks.length * hosts.length)) {
    console.log("Committing " + JSON.stringify(docs));
    store.commit(docs);
  }
}

function commitEdgeSummary(hosts, tick, store) {
  var hostSummary = [];
  for (var i = 0; i < hosts.length; i++) {
    var host = hosts[i];
    hostSummary.push({id: host.name + "/" + tick.tickTime, class_s: 'host summary', name_s: host.name, rotatedOut_s: host.rotatedOut, offline_s: host.offline, tickDate_dt : tick.tickDate});
  }
  store.commit(hostSummary);
}


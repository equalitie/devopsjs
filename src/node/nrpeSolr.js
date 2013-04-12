
var util=require('./lib/util.js')
var program = require('commander');

var hosts = require('../../config/hosts.json');
var store = require('./lib/solrNagios.js');
var nrpe = require('./lib/nrpe/check.js');

var tick = util.getTick();
var numChecks = 0;

program
  .option('-c, --check', 'only execute checks that match this regex')
  .option('-h, --host', 'only check this host')
  .option('-s --save', 'write results (defaults to no if a check or host is specified');

var save = program.save || (!program.check && !program.host);

var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks(program.check ? program.check : null);

for (var key in nrpeChecks) {
    if (obj.hasOwnProperty(key)) numChecks++;
}

var docs = [];

// only include one host
if (program.host) {
	var onlyEdge = program.host;
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

if (save) {
	commitEdgeSummary(hosts, tick, store);
}
	

for (var name in nrpeChecks) {
	for (var i = 0; i < hosts.length; i++) {
		var res = nrpe.checkEdge(hosts[i].name, nrpeChecks[name], tick, function(res) {
			if (save) {
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
    console.log("Committing " + JSON.stringify(docs));
    store.commit(docs);
  }
}

function commitEdgeSummary(hosts, tick, store) {
  var hostSummary = [];
  var nomination = '';
  for (var i = 0; i < hosts.length; i++) {
    var host = hosts[i];
    hostSummary.push({id: host.name + "/" + tick.tickTime, class_s: 'host summary', name_s: host.name, nomination_s: nomination, rotatedOut_s: host.rotatedOut, offline_s: host.offline, tickDate_dt : tick.tickDate});
  }
  store.commit(hostSummary);
}


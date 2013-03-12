
var util=require('./lib/util.js')
var edges = require('./edges.json');
var store = require('./lib/solrNagios.js');
var nrpe = require('./lib/nrpe/check.js');
var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks();
var tick = util.getTick();

var docs = [];

// only include one edge
if (process.argv.length == 3) {
	var onlyEdge = process.argv[2];
	var newEdges;
	for (var i = 0; i < edges.length; i++) {
		if (edges[i].name === onlyEdge) {
			newEdges = [edges[i]];
		}
	}
	if (!newEdges) {
		throw "'" + onlyEdge + "' not found";
	}
	edges = newEdges;
}
if (nrpeChecks.length < 1) {
	throw "No checks";
} else if (edges.length < 1) {
	throw "No edges";
}

commitEdgeSummary(edges, tick, store);

for (var j = 0; j < nrpeChecks.length; j++) {
	for (var i = 0; i < edges.length; i++) {
		var res = nrpe.checkEdge(edges[i].name, nrpeChecks[j], tick, function(res) {
			addResult(res);
		});
	}
}

function addResult(doc) {
  docs.push(doc);
  if (docs.length == (nrpeChecks.length * edges.length)) {
    console.log("Committing " + JSON.stringify(docs));
    store.commit(docs);
  }
}

function commitEdgeSummary(edges, tick, store) {
  var edgeSummary = [];
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    edgeSummary.push({id: edge.name + "/" + tick.tickTime, class_s: 'edge summary', name_s: edge.name, rotatedOut_s: edge.rotatedOut, offline_s: edge.offline, tickDate_dt : tick.tickDate});
  }
  store.commit(edgeSummary);
}


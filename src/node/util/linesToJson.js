var lineReader = require('line-reader');

var edges = [];
lineReader.eachLine('edges.live', function(line, last) {
	var edge = {};
	edge.name = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
console.log(edge.name);
	edge.lastUpdate = new Date().toISOString();
	edge.comment = 'Auto-imported';

	if (/^##/.test(line)) {
		edge.rotatedOut = true;
	} else if (/^#/.test(line)) {
		edge.offline = true;
	}
	edges.push(edge);
	if (last) {
		writeEdges(edges);
	}
});

function writeEdges(edges) {
	console.log(JSON.stringify(edges));
	var fs = require('fs');
	fs.writeFile("/tmp/test", JSON.stringify(edges, null, '\t'));
}


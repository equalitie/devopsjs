var lineReader = require('line-reader');

var hosts = [];
var filename = process.argv[2];

lineReader.eachLine(filename, function(line, last) {
	var host = {};
	host.name_s = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
	host.lastUpdate_dt = new Date().toISOString();
	host.comment_s = 'Auto-imported';

	host.rotatedOut_b = false;
	
	if (/^##/.test(line)) {
		host.rotatedOut_b = true;
	} else if (/^#/.test(line)) {
		host.offline_b = true;
	}
	if (host.name_s) {
		hosts.push(host);
	}
	if (last) {
		console.log(JSON.stringify(hosts, null, '  '));
	}
});



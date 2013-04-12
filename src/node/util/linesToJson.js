var lineReader = require('line-reader');

var hosts = [];
var filename = process.argv[2];

lineReader.eachLine(filename, function(line, last) {
	var host = {};
	host.name_s = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
	host.lastUpdate_dt = new Date().toISOString();
	host.comment_s = 'Auto-imported';

	host.active_b = true;
	
	if (/^##/.test(line)) {
		host.active_b = false;
	} else if (/^#/.test(line)) {
		host.offline_b = true;
		host.active_b = false;
	}
	if (host.name_s) {
		hosts.push(host);
	}
	if (last) {
		console.log(JSON.stringify(hosts, null, '  '));
	}
});



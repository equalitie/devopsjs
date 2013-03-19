var lineReader = require('line-reader');

var hosts = [];
lineReader.eachLine('hosts', function(line, last) {
	var host = {};
	host.name = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
	host.lastUpdate = new Date().toISOString();
	host.comment = 'Auto-imported';

	if (/^##/.test(line)) {
		host.rotatedOut = true;
	} else if (/^#/.test(line)) {
		host.offline = true;
	}
	hosts.push(host);
	if (last) {
		console.log(JSON.stringify(hosts, null, '  '));
	}
});



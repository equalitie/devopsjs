var lineReader = require('line-reader');

var hosts = [];
var filename = process.argv[2];
var last_comment = 'undefined';

lineReader.eachLine(filename, function(line, last) {
	var host = {};
	var now = new Date().toISOString();
	var name = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
	host.hostname = name;
	host.comment = 'Auto-imported ' + now;
	host.added = now;
	
	if (name && !line.match(/^# .*/)) {
		
		if (/^##/.test(line)) {
			host.lastInactive = now;
			host.state = 'inactive';
		} else if (/^#/.test(line)) {
			host.state = 'offline';
			host.lastOffline = now;
			host.comment = last_comment;
		} else {
			host.state = 'active';
			host.lastActive = now;
		}
		
		hosts.push(host);
	} else {
		last_comment = name;
	}
	
	if (last) {
		console.log(JSON.stringify(hosts, null, '  '));
	}
});



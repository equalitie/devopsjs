var lineReader = require('line-reader');

var hosts = [];
var filename = process.argv[2];
var last_comment = 'undefined';

lineReader.eachLine(filename, function(line, last) {
	var host = {};
	var now = new Date().toISOString();
	var name = line.replace(/^#[^a-z]*/, '').replace(/#.*/, '');
	host.name_s = name;
	host.lastUpdate_dt = now;
	host.comment_s = 'Auto-imported ' + now;
	host.added_dt = now;
	
	if (name && !line.match(/^# .*/)) {
		
		if (/^##/.test(line)) {
			host.inactive_dt = now;
		} else if (/^#/.test(line)) {
			host.offline_b = true;
			host.offline_dt = now;
			host.comment_s = last_comment;
		} else {
			host.active_b = true;
			host.active_dt = now;
		}
		
		hosts.push(host);
	} else {
		last_comment = name;
	}
	
	if (last) {
		console.log(JSON.stringify(hosts, null, '  '));
	}
});



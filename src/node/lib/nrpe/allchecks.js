exports.getChecks = function(filter) {
	var checks = [
	{ name: 'check_tcptraffic'
		, isError: function(error, stdout) { if (/^TCPTRAFFIC UNKNOWN/.test(stdout)) return true; if (/^TCPTRAFFIC/.test(stdout)) return false; return true}, assign: function(res, stdout) { res.bytesPerSecond_i = stdout.split('|')[0].split(' ')[4]; } }
	,	{ name: 'check_fail2ban', isError: function(error, stdout) { if (/^fail2ban UNKNOWN/.test(stdout)) return true; if (/^fail2ban/.test(stdout)) return false; return true}, assign: function(res, stdout) { res.httpBans_i = stdout.split('=')[1].replace(/;.*$/, ''); res.sshBans_i = stdout.split('=')[2].replace(/;.*$/, ''); } }
];
	if (filter) {
		var ret = [];
		for (var i = 0; i < checks.length; i++) {
			if (checks[i].name.match(filter)) {
console.log(checks[i].name + ":" + filter);
				ret.push(checks[i]);
			}
		}
		return ret;
	} else {
		return checks;
	}
}

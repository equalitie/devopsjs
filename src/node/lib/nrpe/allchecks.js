var defaultNumber = function() { }

exports.getChecks = function(filter) {

	var checks = [];
	 checks.check_tcptraffic = {
		isError: function(error, stdout) { 
			if (/^TCPTRAFFIC UNKNOWN/.test(stdout)) {
				return true; 
			} else if (/^TCPTRAFFIC/.test(stdout)) {
				return false;
			}
			
			return true;
		},
		fields : { bytesPerSecond_i : defaultNumber},
		assign: function(res, stdout) { 
			res.bytesPerSecond_i = stdout.split('|')[0].split(' ')[4]; 
			} 
		};
	 checks.check_connections = {
		isError: function(error, stdout) { 
			if (/^CONNECTIONS/.test(stdout)) {
				return false; 
			}
			
			return true;
		},
		fields : { established_i : defaultNumber, waiting_i : defaultNumber, listeners_i : defaultNumber},
		assign: function(res, stdout) { 
			// CONNECTIONS OK - There are 11 established connections. | established=11;; waiting=0;; listeners=11;;
			var vals = stdout.split('|')[1].split('; ');
			res.established_i = vals[0].replace(/[^\d]/g, '');
			res.waiting_i = vals[1].replace(/[^\d]/g, '');
			res.listeners_i = vals[2].replace(/[^\d]/g, '');
			} 
		};
	checks.check_fail2ban = {
		isError: function(error, stdout) { 
			if (/^fail2ban UNKNOWN/.test(stdout)) return true; 
			if (/^fail2ban/.test(stdout)) return false; 
			return true;
		},
		fields : { httpBans_i : defaultNumber, sshBans_i : defaultNumber},
		assign: function(res, stdout) { 
			res.httpBans_i = stdout.split('=')[1].replace(/;.*$/, '');
			res.sshBans_i = stdout.split('=')[2].replace(/;.*$/, ''); 
		} 
	};

	if (filter) {
		var ret = {};
		for (var i in checks) {
			if (i.match(filter)) {
				ret = checks[i];
			}
		}
		return ret;
	} else {
		return checks;
	}
}

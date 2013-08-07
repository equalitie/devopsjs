exports.checkHost = function(host, aCheck, checkName, tick, callback) {
	var exec=require('child_process').exec;
	var cmd = '/usr/lib/nagios/plugins/check_nrpe -H ' + host + ' -c ' + checkName;

	var e = exec(cmd, function (error, stdout, stderr) {
		var res = {};
		res.id = host + "/" + checkName + "/" + tick.tickTime;
		res['@timestamp'] = tick.tickDate;
		res.execTime = new Date().getTime() - tick.tickTime;
		res.checkName = checkName;
		res.hostname = host;
		var status = "UNKNOWN";
		if (stdout) {
			res.stdout = stdout;
			['OK', 'WARNING', 'CRITICAL', 'UNKNOWN'].forEach(function(r) { 
				if (stdout.indexOf(r) > -1) {
					status = r;
				}
			});	
		}
		res.status = status;
		if (aCheck.isError(error, stdout)) {
			res.error = stdout;
		} else {
			try {
				var check = aCheck.assign(stdout);
        res[checkName] = check;
			} catch (e) {
				res.status = 'EXCEPTION';
				res.error = e + ':' + stdout;
				GLOBAL.exception(res);
			}
			
		}
		callback(res);
	});
}


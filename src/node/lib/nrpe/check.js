exports.checkEdge = function(edge, aCheck, checkName, tick, callback) {
	var exec=require('child_process').exec;
	var cmd = '/usr/lib/nagios/plugins/check_nrpe -H ' + edge + ' -c ' + checkName;

	var e = exec(cmd, function (error, stdout, stderr) {
		var res = {};
		res.id = edge + "/" + checkName + "/" + tick.tickTime;
		res.tickDate_dt = tick.tickDate;
		res.execTime_i = new Date().getTime() - tick.tickTime;
		res.aCheck_s = checkName;
		res.edge_s = edge;
		var status = "UNKNOWN";
		if (stdout) {
			res.stdout_s = stdout;
			['OK', 'WARNING', 'CRITICAL', 'UNKNOWN'].forEach(function(r) { 
				if (stdout.indexOf(r) > -1) {
					status = r;
				}
			});	
			
		}
		res.status_s = status;
		if (aCheck.isError(error, stdout)) {
			res.error_t = stdout;
		} else {
			try {
				aCheck.assign(res, stdout);
			} catch (e) {
				res.status_s = 'EXCEPTION';
				res.error_t = e;
			}
			
		}
		callback(res);
	});
}


exports.checkEdge = function(edge, aCheck, tick, callback) {
	var exec=require('child_process').exec;
	var cmd = '/usr/lib/nagios/plugins/check_nrpe -H ' + edge + ' -c ' + aCheck.name;

	var e = exec(cmd, function (error, stdout, stderr) {
		var res = {}
		res.id = edge + "/" + aCheck.name + "/" + tick.tickTime;
		res.tickDate_dt = tick.tickDate;
		res.execTime_i = new Date().getTime() - tick.tickTime;
		res.aCheck_s = aCheck.name;
		res.edge_s = edge;
	
		if (aCheck.isError(error, stdout)) {
			res.error_t = stdout;
		} else {
			aCheck.assign(res, stdout);
		}
		callback(res);
	});
}

exports.getTick = function() {
	return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() }
}


exports.getConfig = function(file) {
    var fs = require("fs");
	var o = require(file);

	return o;
}

exports.getTick = function() {
        return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() }
}


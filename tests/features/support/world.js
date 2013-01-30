var utils = require("../../../src/node/lib/util.js");

var World = function World(callback) {

	this.confFile = "../localConfig.json";

	this.getConfigFile = function() {
		try {
			var o = utils.getConfig(this.confFile);
		} catch(e) {
			throw "Missing config file " + this.confFile;
		}
		if (o.host) {
			return o;
		} else {
			throw "Missing data in " + this.confFile;
		}
	}

	callback(this);
};

exports.World = World;

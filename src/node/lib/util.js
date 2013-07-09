exports.getTick = function() {
        return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() }
}
exports.config = function() {
  var configBase;
  if (process.env.DEVOPSCONFIG) {
    configBase = process.env.DEVOPSCONFIG;
  } else {
    configBase = process.cwd() + '/config/';
  }

  try {
    require(configBase + 'localConfig.js');
  } catch (e) {
    throw 'Could not require "' + configBase + '/localConfig.js" — define DEVOPSCONFIG or run this program from its parent directory.';
  }
}

exports.confFile = "config/localConfig.js";



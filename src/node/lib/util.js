exports.getTick = function() {
        return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() }
}

/**
*
* Loads configuration based on current environmental setting of DEVOPSCONFIG base. 
* sets DEVOPS_DEBUG 
*
**/

var configBase;

exports.getConfigBase = function() {
  return configBase;
}

exports.slashedDir = function(d) {
  if (d.match(/.*\/$/)) {
    return d;
  }
  return d + '/';
}

exports.config = function() {
  if (process.env.DEVOPSCONFIG) {
    configBase = process.env.DEVOPSCONFIG;
  } else {
    configBase = process.cwd() + '/config/';
  }

  try {
    require(configBase + 'localConfig.js');
    GLOBAL.CONFIG.configBase = configBase;

    if (process.env.DEVOPS_DEBUG) {
      GLOBAL.CONFIG.DEBUG = true;
      require('node-monkey').start();
    }

  } catch (e) {
    throw 'Could not require "' + configBase + '/localConfig.js" — define DEVOPSCONFIG or run this program from its parent directory.';
  }
}


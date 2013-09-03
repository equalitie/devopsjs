exports.getTick = function() {
        return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() }
}

/**
*
* Loads configuration based on current environmental setting of DEVOPSCONFIG base. 
* checks for DEVOPS_DEBUG 
*
**/

var configBase, store;

exports.getConfigBase = function() {
  return configBase;
}

exports.slashedDir = function(d) {
  if (d.match(/.*\/$/)) {
    return d;
  }
  return d + '/';
}

exports.config = function(config) {
  if (process.env.DEVOPSCONFIG) {
    configBase = process.env.DEVOPSCONFIG;
  } else {
    configBase = process.cwd() + '/config/';
  }

  var trying = configBase + 'localConfig.js';
  try {
    require(trying);
    GLOBAL.CONFIG.configBase = configBase;
    if (config) {
      trying = configBase + config + '.js';
      require(trying);
    }
  } catch (e) {
    throw 'Could not require "' + trying + '" — define DEVOPSCONFIG or run this program from its parent directory.';
  }
  if (process.env.DEVOPS_DEBUG) {
    GLOBAL.CONFIG.DEBUG = true;
    require('node-monkey').start();
  }

  GLOBAL.CONFIG.getStore = function() {
    return store || require('./elasticSearchStore.js');
  }
}


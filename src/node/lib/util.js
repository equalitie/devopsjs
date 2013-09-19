exports.getTick = function() {
        return { tickTime : new Date().getTime(), tickDate : new Date().toISOString() };
};

/**
*
* Loads configuration based on current environmental setting of DEVOPSCONFIG base. 
* checks for DEVOPS_DEBUG 
*
**/

var configBase, store;

exports.getConfigBase = function() {
  return configBase;
};

exports.slashedDir = function(d) {
  if (d.match(/.*\/$/)) {
    return d;
  }
  return d + '/';
};

/** 

conf : { configBase : alternate location, dnet: dnet configs }

set some useful GLOBAL.CONFIG variables

**/

exports.config = function(conf) {
  conf = conf || {};
  if (conf.configBase) {
    configBase = conf.configBase;
  } else {
    configBase = process.cwd() + '/config/';
  }

  var trying = configBase + 'localConfig.js';
  try {
    require(trying);
    GLOBAL.CONFIG.configBase = configBase;
    if (conf.dnet) {
      trying = configBase + conf.dnet + '.js';
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
  };
  var winston = require('winston');
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: process.env.DEVOPSDEBUG || 'error' })
    ]
  });

  logger.emitErrs = false;
  GLOBAL.CONFIG.logger = logger;
};


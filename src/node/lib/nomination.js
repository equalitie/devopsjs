var queue = require('queue-async');
var dns = require('dns');

var resolver = {
  resolve : function(hosts, configs, callback) {
    var resolveQueue = queue();
    hosts.forEach(function(h) {
      resolveQueue.defer(function(callback) { 
        dns.lookup(h, function (err, addy) {
          resolved.hosts[h] = addy;
          callback(null);
        });
      });
    });
    configs.forEach(function(c) {
      resolveQueue.defer(function(callback) {
        dns.resolve4(c, function(err, addies) { resolved.configs[c] = addies; callback(null) })
      });
    });
    resolveQueue.awaitAll(function(error) { callback(resolved); });
  }, getConfig : function(host) {
    var ha = resolved.hosts[host];
    if (!ha) {
      throw "No address for " + host + ' in ' + JSON.stringify(resolved.hosts);
    }
    for (var c in resolved.configs) {
      var config = resolved.configs[c];
      for (var ca in config) {
        if (config[ca] === ha) {
          return c;
        }
      }
    }
    return null;
  }
}

var resolved = { configs : {}, hosts: {}};
module.exports = resolver;

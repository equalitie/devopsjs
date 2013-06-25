var queue = require('queue-async');
var dns = require('dns');

var resolver = {
  resolve : function(hosts, dnets, callback) {
    var resolveQueue = queue();
    hosts.forEach(function(h) {
      resolveQueue.defer(function(callback) { 
        dns.lookup(h, function (err, addy) {
          resolved.hosts[h] = addy;
          callback();
        });
      });
    });
    dnets.forEach(function(c) {
      resolveQueue.defer(function(callback) {
        dns.resolve4(c, function(err, addies) { 
          resolved.dnets[c] = addies; 
          callback() 
        });
      });
    });
    resolveQueue.awaitAll(function(error) { 
      callback(resolved); 
    });
  }, getConfig : function(host) {
    var ha = resolved.hosts[host];
    if (!ha) {
      throw "No address for " + host + ' in ' + JSON.stringify(resolved.hosts);
    }
    for (var c in resolved.dnets) {
      var dnet = resolved.dnets[c];
      for (var ca in dnet) {
        if (dnet[ca] === ha) {
          return c;
        }
      }
    }
    return null;
  }, hostIP : function(host) {
    return resolved.hosts[host];
  }
}

var resolved = { dnets : {}, hosts: {}};
module.exports = resolver;

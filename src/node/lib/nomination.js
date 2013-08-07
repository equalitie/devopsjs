var queue = require('queue-async')
  , dns = require('dns')
  , geoip = require('geoip')
  , city = new geoip.City('/usr/local/geoip/GeoLiteCity.dat')
  , resolved = { dnets : {}, hosts: {}, geo : {}};

var resolver = {
  resolve : function(hosts, dnets, callback) {
    var resolveQueue = queue();
/** get the IP address for each host **/
    hosts.forEach(function(h) {
      resolveQueue.defer(function(callback) { 
        dns.lookup(h, function (err, addy) {
          resolved.hosts[h] = addy;
          var res = city.lookupSync(addy);
          if (res) { 
            res.lonlat = [res.latitude, res.longitude];
            resolved.geo[h] = res;
          }
          callback();
        });
      });
    });
/** get the edges in each dnet **/
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
  }, getDnet : function(host) {
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
  }, getHostIP : function(host) {
    return resolved.hosts[host];
  }, getGeo : function(host) {
    return resolved.geo[host];
  }

}

module.exports = resolver;

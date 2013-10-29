/* global require, module, setTimeout*/
/*jshint node:true */
// Author: Cormac McGuire
// ### Description
// helpers for dns requests

var Q = require('q');
var dns = require('dns');

module.exports = function () {
  var resolveAddress, resolveAliases;

  var getTimeIntegerInSeconds = function () {
    return parseInt((Date.now() / 1000), 10);
  };
  /**
   * return a promise for the resolved addresses
   * @param hostname
   * @returns {closureModules.promise|*|promise|Function|Q.promise|webdriver.promise}
   */
  resolveAddress = function(hostname) {
    var deferred, then, now, resolveTime;
    deferred = Q.defer();
    then = getTimeIntegerInSeconds();
    dns.resolve(hostname, function (err, addresses) {
      now = getTimeIntegerInSeconds();
      resolveTime = now - then;
      deferred.resolve({
        addresses: addresses,
        resolveTime: resolveTime
      });
    });
    return deferred.promise;
  };

  /**
   * resolve aliases(subdomains?) for a site
   * return a promise for the array of resolved addresses for each alias
   * @param aliases
   * @param hostname
   * @returns {closureModules.promise|*|promise|Function|Q.promise|webdriver.promise}
   */
  resolveAliases = function(aliases, hostname) {
    var promises = [];
    aliases = aliases.map(function (alias) {
      return alias + '.' + hostname;
    });

    aliases.forEach(function (alias) {
      var deferred;
      deferred = Q.defer();
      dns.resolve(alias, function (err, addresses) {
        console.log(err);
        console.log(addresses);
        if (addresses === undefined) {
          throw new Error('alias ' + alias + ' did not resolve');
        }
        deferred.resolve(addresses);
      });
      promises.push(deferred.promise);
    });

    return Q.all(promises);
  };
  
  return {
    resolveAddress: resolveAddress,
    resolveAliases: resolveAliases
  };
}();
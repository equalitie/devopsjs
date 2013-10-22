/*global module, require */
/**
 * Created by cormac on 22/10/2013.
 * test helpers for http requests
 */

module.exports = function () {
  'use strict';
  var contentHashes,
      createOptions,
      searchForContentInRequest,
      resolveContent;

  var http   = require('http');
  var Q      = require('q');
  var crypto = require('crypto');

  /**
   * hashes of expected content
   * @type {{deflect: string}}
   */
  contentHashes = {
    'deflect': '6df015757ea1cfa9cc0057293ed8f6e1'
  };
  createOptions = function (hostname, path) {
    var options = {
      hostname: hostname,
      port: 80,
      path: path,
      method: 'GET'
    };
    return options;
  };


  /**
   * return a hash of the expected content
   * @param contentKey
   * @returns {string}
   */
  resolveContent = function (contentKey) {
    return contentHashes[contentKey];
  };

  /**
   * take two paths and map them to results indicating whether or not the
   * desired element was found
   * return a promise with the results
   * @param hostname
   * @param paths
   */
  searchForContentInRequest = function (hostname, paths, contentKey) {
    var promises = [],
        contentHash = resolveContent(contentKey),
        runRequest;

    runRequest = function (path) {
      var options = createOptions(hostname, path),
          deferred = Q.defer(),
          responseData, req;

      req = http.request(options, function (res) {
        var responseData = '',
            md5sum = crypto.createHash('md5');
        res.on('data', function (chunk) {
          md5sum.update(chunk);
        });
        res.on('end', function () {
          var hash = md5sum.digest('hex');
          var contentMatch = hash === contentHash;
          deferred.resolve(contentMatch);

        });

      });
      promises.push(deferred.promise);

      req.end();

    };
    paths.forEach(runRequest);
    return Q.all(promises);



  };

  return {
    searchForContentInRequest: searchForContentInRequest
  };

}();
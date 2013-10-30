/*global module, require */
/**
 * Created by cormac on 22/10/2013.
 * test helpers for http requests
 */

module.exports = (function () {
  'use strict';
  var contentHashes,
      createOptions,
      searchForContentInRequest,
      resolveContent,
      headers;

  var http    = require('http');

  var Q       = require('q');
  var _       = require('lodash');
  var crypto  = require('crypto');
  var request = require('request');

  /**
   * hashes of expected content
   * @type {{deflect: string}}
   */
  contentHashes = {
    'deflect':
      [
        '6df015757ea1cfa9cc0057293ed8f6e1',
        'e55cc36c1fdf86b12bf0fecf8d3e79b6'
      ]
  };
  createOptions = function (hostname, path) {
    path = path || '/';
    var options = {
      uri: 'http://' + hostname,
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
   * group header functionality
   * move to a new module?
   *
   * @type {{}}
   */
  headers = {};

  var extractCacheVariable = function (header) {
    var inspectableHeaders = header.match(/\[(.*)\]/)[1].split(' ')[0],
      cacheIndex = inspectableHeaders.indexOf('c') + 1;
    return inspectableHeaders[cacheIndex];
  };

  /**
   * check to see if a header is a cache hit or miss based on it's via header from
   * ATS, Based on:
   * http://trafficserver.apache.org/docs/v2/admin/trouble.htm#interpret_via_header
   * @param header
   * @returns {boolean}
   */
  headers.isNotFromCache = function(header) {
    return extractCacheVariable(header) === 'M';
  };

  headers.isFromCache = function(header) {
    return extractCacheVariable(header) === 'H';
  };


  /**
   * return the headers fro a specified hostname
   * return a promise for the result
   * @param hostname
   * @returns {promise|*|Function|Q.promise}
   */
  headers.retrieveHeaders = function (hostname, path) {
    var options, req, deferred;

    deferred = Q.defer();
    options = createOptions(hostname, path);

    req = request.get(options, function(err, res){
      deferred.resolve(res.headers);
    });
    return deferred.promise;
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
          req;

      req = request.get(options, function (err, res) {
        var hash, contentMatch,
            md5sum = crypto.createHash('md5');
        md5sum.update(res.body);
        hash = md5sum.digest('hex');
        contentMatch = _.contains(contentHash, hash);
        deferred.resolve(contentMatch);
      });
      promises.push(deferred.promise);
    };
    paths.forEach(runRequest);
    return Q.all(promises);
  };

  return {
    searchForContentInRequest: searchForContentInRequest,
    headers                  : headers
  };

}());

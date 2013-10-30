/*global require*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: 
// 
//
var Q  = require('q');
var fs = require('fs');
var _  = require('lodash');

module.exports = (function() {

  var configVars = {};

  var get = function(key) {
    return configVars[key];
  };

  var set = function (key, value) {
    configVars[key] = value;
  };


  var readFileToPromise = function (source) {
    var template = source || get('source');
    console.log('readFileToPromise', template);
    return readFile(template);
  };

  var writeTemplateFile = function(templateString, context) {
    var resultTemplate = _.template(templateString),
        resultObjectString, resultString,
        resultFilename = get('dest');

    context = context || get ('context');
    resultObjectString = JSON.stringify(context);
    resultString = resultTemplate({ vars: resultObjectString });
    console.log(resultFilename, resultString);

    return writeFile(resultFilename, resultString);

  };

  // promises wrapper around readFile
  var readFile = function(sourceFile) {
    var deferred = Q.defer();

    fs.readFile(sourceFile, { encoding: 'utf8' }, function (err, data) {
      console.log('readFile callback');
      if (err) {
        console.log('readFile rejected');
        deferred.reject(err);
      }
      else {
        console.log('readFile resolved');
        deferred.resolve(data);
      }
    });
    return deferred.promise;
  };

  // promises wrapper around writeFile
  var writeFile = function(filename, contents) {
    console.log('writeFile: %s\n %s', filename, contents);
    var deferred = Q.defer();
    fs.writeFile(filename, contents, function (err) {
      console.log('in write file callback');
      if (err) {
        console.log(err);
        deferred.reject(err);
      }
      else {
        deferred.resolve();
      }
    });
    return deferred.promise;
  };

  return {
    file: {
      readFile : readFile,
      writeFile: writeFile
    },
    readFileToPromise: readFileToPromise,
    writeTemplateFile: writeTemplateFile,
    set              : set,
    get              : get
  };

}());

/*global require*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: 
// Simple reporter to write the results to a file that can then be required

var fs = require('fs');

var Q = require('q');
var _ = require('lodash');

var fileHelper = require('./lib/file-helpers.js');

module.exports = FileReporter;

var resultObject;
function FileReporter(runner) {
  var passes, fails;
  passes = 0;
  fails = 0;
  resultObject = {
    tests: [],
    passes: 0,
    fails: 0
  };


  runner.on('pass', function(test) {
    passes++;
    resultObject.tests.push({
      title: test.fullTitle(),
      result: 'pass'
    });
  });

  runner.on('fail', function(test) {
    fails++;
    resultObject.tests.push({
      title: test.fullTitle(),
      result: 'fail'
    });
  });

  runner.on('end', function(test) {
    resultObject.passes = passes;
    resultObject.fails = fails;
    resultObject.total = passes + fails;
    fileNotWritten = true;

    var testsWritten = writeTestResults();
    testsWritten
      .then(function () {
        console.log('in then in main loop');
        process.exit(fails);
        fileNotWritten = false;
      })
      .fail(function() {
        console.log('in fail in main loop');
        fileNotWritten = false;
      })
      .done(function() {
        console.log('in done in main loop');
        fileNotWritten = false;
      });
    while(fileNotWritten) {
    }
    return;

  });
}

var writeTestResults = function() {
  var rootDir = require("path").resolve(__dirname),
      dest = rootDir + '/results.js',
      source = rootDir + '/templates/context.tpl',
      deferred = Q.defer();

  console.log(dest, source, resultObject);
  fileHelper.set('source', source);
  fileHelper.set('dest', dest);
  fileHelper.set('context', resultObject);

  fileHelper.readFileToPromise()
    .then(fileHelper.writeTemplateFile)
    .then(function() {
      console.log('after write');
      deferred.resolve();
    });
  return deferred.promise;
};


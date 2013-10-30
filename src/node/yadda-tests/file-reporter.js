/*global require*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: 
// Simple reporter to write the results to a file that can then be required

var fs = require('fs');

var Q = require('q');
var _ = require('lodash');

var fileHelper = require('./lib/file-helpers.js');

module.exports = function() {
  var resultObject, outFile, format;

  var FileReporter = function(runner) {
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
      writeTestResults();

    });
  };

  var config = function(defaults) {
    outFile = defaults.outFile;
    format  = defaults.format;
  };

  /**
   * write the test results to a file
   */
  var writeTestResults = function() {
    var rootDir = require("path").resolve(__dirname),
        resultString,
        dest = outFile,
        source = rootDir + '/templates/context.tpl';

    console.log(dest, source, resultObject);
    fileHelper.set('source', source);
    fileHelper.set('dest', dest);
    fileHelper.set('context', resultObject);
    if (format === 'json') {
      resultString = JSON.stringify(resultObject);
    }
    else {
      var template = _.template(fs.readFileSync(source, {encoding: 'utf8' }));
       resultString = template({
        vars: JSON.stringify(resultObject)
      });
    }

    fs.writeFileSync(dest, resultString);
  };

  return {
    config  : config,
    reporter: FileReporter
  };
}();



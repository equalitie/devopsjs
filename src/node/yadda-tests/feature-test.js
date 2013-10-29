/*global require, feature*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: include the test specs
// 
var fs = require('fs');
var _ = require('lodash');

var Yadda = require('yadda');
Yadda.plugins.mocha();

/**
 * sme context for our tests -
 * TODO - these ip addresses need to be generated
 * @type {{deflectServers: {cname: string, ipAddresses: Array}}}
 */
var ctx = {
  deflectServers: {
    cname: 'staging.deflect.ca',
    ipAddresses: [
      '199.127.98.98',
      '174.138.175.2',
      '89.187.143.71',
      '198.15.119.95',
      '89.187.143.164',
      '89.187.143.40',
      '31.131.27.23'
    ]
  }
};

// the directory where test locations are kept
var testDirectory = 'src/node/yadda-tests/generated/';

/**
 * read the directory containing tests and call the iterator
 * @param featureDir
 */
var iterateOverFeatureDirectories = function (featureDir) {
  // sync read file for simplicity and because I've wasted enough time getting it to work with
  // promises and callbacks :( execution was ending before promise resolved
  // promises version can be seen in commit 889fb893e0bc2167ef6665d20521f93dc3be9c4a
  var directories;
  directories = fs.readdirSync(featureDir);
  runFeatures(directories);
};

/**
 * iterator to run tests on each directory
 * @param featureDirs
 */
var runFeatures = function (featureDirs) {
  featureDirs.forEach(runFeature);
};

/**
 * run the generated tests
 * @param featureDir
 */
var runFeature = function (featureDir) {
  feature(testDirectory + featureDir + '/site.feature', function(feature) {
    var featureContext = require('./generated/' + featureDir + '/context.js');
    ctx = _.defaults(featureContext, ctx);
    var library = require('./library/devops-library');
    var yadda  = new Yadda.Yadda(library, ctx);

    scenarios(feature.scenarios, function(scenario, done) {
      yadda.yadda(scenario.steps, done);
    });

  });
};
iterateOverFeatureDirectories(testDirectory);
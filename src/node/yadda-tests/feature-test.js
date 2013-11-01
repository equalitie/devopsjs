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
  try {
    directories = require('./single-test.js');
  }
  catch(e) {
  }
  directories = directories || fs.readdirSync(featureDir);
  console.log(directories);
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
    ctx.deflectServers.ipAddresses = _.map(featureContext.dnetHosts, function(dnetHost) {
      return dnetHost.ipv4;
    });
    var library = require('./library/devops-library');
    var yadda  = new Yadda.Yadda(library, ctx);

    scenarios(feature.scenarios, function(scenario, done) {
      yadda.yadda(scenario.steps, done);
    });

  });
};
iterateOverFeatureDirectories(testDirectory);

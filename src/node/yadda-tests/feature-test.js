/*global require, feature*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: include the test specs
// 
var FS = require('Q-io/fs');
var Q = require('Q');
var fs = require('fs');
var _ = require('lodash');

var Yadda = require('yadda');
Yadda.plugins.mocha();

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

var testDirectory = 'src/node/yadda-tests/generated/';
var directories = [
  'Equality#equalit.ie'
];

var iterateOverFeatureDirectories = function (featureDir) {
  var deferred  = Q.defer();

  fs.readdir(featureDir, function (err, files) {
    console.log('dir read');
    if (err) {
      deferred.reject(err);
    }
    deferred.resolve(files);
  });

  deferred.promise
    .then(function (foundDirectories) {
      console.log('inside then');
      directories = foundDirectories;
      console.log(directories);
      return runFeatures(directories);
    })
    .fail(function () {
      console.log('fail dir list')

    })
    .done(function () {
      console.log('done dir list');
    });

//  runFeatures(directories);
};

var runFeatures = function (featureDirs) {
  featureDirs.forEach(runFeature);
};

/**
 * run the
 * @param featureDir
 */
var runFeature = function (featureDir) {
  console.log('runFeature');
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



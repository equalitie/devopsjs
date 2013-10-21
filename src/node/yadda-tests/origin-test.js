/*global require, feature*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: inclued the test specs
// 

var Yadda = require('yadda');
Yadda.plugins.mocha();

var ctx = {
  deflectServers: {
    deflect: 'staging.deflect.ca'
  }
};
feature('src/node/yadda-tests/features/origin-spec.feature', function(feature) {

  var library = require('./library/devops-library');
  var yadda  = new Yadda.Yadda(library, ctx);

  scenarios(feature.scenarios, function(scenario, done) {
    yadda.yadda(scenario.steps, done);
  });

});


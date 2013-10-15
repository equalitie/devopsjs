/*global require, feature*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: inclued the test specs
// 

var Yadda = require('yadda');
Yadda.plugins.mocha();

var ctx = {
  myhost: 'secure.wikifier.org'
};
feature('./yadda-tests/origin-spec.feature', function(feature) {
  var library = require('./devops-library');
  var yadda  = new Yadda.Yadda(library, ctx);

  scenarios(feature.scenarios, function(scenario, done) {
    yadda.yadda(scenario.steps, done);
  });

});


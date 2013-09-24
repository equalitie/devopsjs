/*global require*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: inclued the test specs
// 

var Yadda = require('yadda').Yadda;
require('yadda').plugins.mocha();

var library = require('./devops-library');
var yadda  = new Yadda(library);

yadda.mocha('Origin', './yadda-tests/origin-spec.feature');

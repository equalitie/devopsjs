#!/usr/bin/env node
/*global require*/
/*jshint node:true*/
// Author: Cormac McGuire
// ### Description: 
// cli to run bdd tests

'use strict';
var Mocha   = require('mocha'),
    fs      = require('fs'),
    path    = require('path'),
    program = require('commander'),
    _       = require('lodash'),
    
    fileReporter  = require('../file-reporter.js');

// First, you need to instantiate a Mocha instance.
var mocha = new Mocha();

program
  .version('0.0.1')
  .option('-f, --file')
  .option('-O, --outfile [outfile]', 'write results to provided file') 
  .option('-S, --site [sitename]', 'test against single site')
  .parse(process.argv);

var rootDir = path.resolve(__dirname);

var singleTestTemplate = _.template(
  fs.readFileSync(rootDir + '/../templates/single-test.tpl.js',
    {encoding: 'utf8'})
);

var fileString;
var dir = program.site ? '"' + program.site + '"' : 'undefined';


fileString = singleTestTemplate({dir: dir});
fs.writeFileSync(rootDir + '/../single-test.js', fileString);


mocha.addFile(
  rootDir + '/../feature-test.js'
);


if (program.file || program.outfile) {
  var reporterDefaults = {
  };
  reporterDefaults.outFile = program.outfile || rootDir + '/../results.js';
  if (program.outfile) {
    reporterDefaults.format = 'json';
  }

  fileReporter.config(reporterDefaults);
  mocha.reporter(fileReporter.reporter).run();
}
else {
  mocha.reporter('spec').run();
}

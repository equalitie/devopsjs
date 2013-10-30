/*global runs, describe, beforeEach, afterEach, xit, it, expect */
// Author: Cormac McGuire
// ### Description
// test file writing for the custom test reporter

var fileHelper = require('../lib/file-helpers.js');
(function () {
  'use strict';
  var fs     = require('fs');
  var expect = require('chai').expect;
  var Q      = require('q');

  Q.longStackSupport = true;

  describe('File writing with promises', function() {
    var rootDir, dest, source;

    beforeEach(function() {
      rootDir = require("path").resolve(__dirname);
      dest = rootDir + '/outfile.js';
      source = rootDir + '/../templates/context.tpl';
      fileHelper.set('source', source);
      fileHelper.set('dest', dest);
    });

    afterEach(function(done) {
      fs.unlink(fileHelper.get('dest'), function() {
        done();
      });
    });

    it('should set up the source and destination files correctly', function(){
      expect(fileHelper.get('dest')).to.eql(dest);
      expect(fileHelper.get('source')).to.eql(source);
    });

    it('should return a promise for a file\'s contents', function(done){
      fileHelper.readFileToPromise()
        .then(function (fileString) {
          expect(fileString).to.be.a('string');
          expect(fileString.search('module')).to.be.above(-1);
          done();
        });
    });

    it('should return a promise to a written file', function(done) {
      var context = { vars: '{foo:\'bar\'}' };
      var templateString = '<%=vars %>';
      fileHelper.writeTemplateFile(templateString, context)
        .then(function() {
          fileHelper.file.readFile(fileHelper.get('dest'))
            .then(function (fileString) {
              expect(fileString).to.be.a('string');
              expect(fileString.search('foo')).to.be.above(-1);
              done();
            });
        });
    });
    it('should read a file as a template and write it out', function(done){
      var context = {foo:'bar'};
      fileHelper.set('context', context);
      fileHelper.readFileToPromise()
        .then(fileHelper.writeTemplateFile)
        .then(function () {
          fileHelper.file.readFile(fileHelper.get('dest'))
            .then(function (fileString) {
              expect(fileString).to.be.a('string');
              expect(fileString.search('foo')).to.be.above(-1);
              done();
            });
        });
    });
  });


}());

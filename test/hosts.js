// Author: Vid
// ### Description
// test host library

(function () {
  'use strict';
  var expect = require('chai').expect;
  var mockHosts = require('../test/mock/hosts.json');
  var hostLib;
  var fs     = require('fs');
  var path = require("path");
  var tmpDir = './tmp';

  describe('Host library functions', function() {
    beforeEach(function() {
      rmFiles(tmpDir); 
      hostLib = require('../src/node/lib/hosts.js');
    });

    afterEach(function(done) {
      done();
    });

    it("must request comment", function testMustComment() {
      var excepted = false;
      try {
        hostLib.mustComment();
      } catch (e) {
        excepted = true;
      }
  
      expect(excepted).to.be.equal(true);
    });
  
    it("adds", function(done) {
      var newHost = 'testAdd';
      hostLib.setConfig({ comment : 'add'});
      var hp = hostLib.addHost(newHost, mockHosts);
  
      var found = hp.hosts.filter(function(e) { return (e.hostname === newHost); });
      expect(found.length).is.equal(1);
      done();
    });
  
    it("removes",function(done) {
      var remHost = 'testing.test.com';
      hostLib.setConfig({ comment : 'add'});
      var hp = hostLib.removeHost(remHost, mockHosts);
  
      var found = hp.hosts.filter(function(e) { return (e.hostname === remHost); });
      expect(found.length).is.equal(0);
      done();
    });

    it('should write all hosts', function(done){
      hostLib.writeFlatHosts(mockHosts, true, 'tmp/allhosts');
      fs.exists('tmp/allhosts', function(exists) {
        expect(exists).to.equal(true);
        var hostsLines = fs.readFileSync('./tmp/allhosts').toString().trim().split('\n');
        hostsLines.splice(0, 1);
        expect(hostsLines.length).to.be.equal(mockHosts.length);
        
        done();
      });
    });

 
  });

/**
* Cleanup tmp dir
**/

  function rmFiles(dir) {
    var list = fs.readdirSync(dir);
    if (!list.length) {
      return;
    }
    for(var i = 0; i < list.length; i++) {
      var filename = path.join(dir, list[i]);
      var stat = fs.statSync(filename);
      
      if(stat.isDirectory()) {
        rmdirSync(filename);
      } else {
        fs.unlinkSync(filename);
      }
    }
  }

}());

#!/usr/bin/env node

var fs = require('fs');

var mockSolr = {
    createQuery : function() {
		return this;
	},
	q : function(parameters) {
	},
	sort : function(parameters) {
	},
	search : function(statsQuery, callback) {
	},
	createClient : function(config) {
		return this;
	},
	add : function(docs, callback) {
	}
}

var program = {verbose:0};

GLOBAL.CONFIG = { minActive: 6, flatHostsFile : 'edges.test', solrConfig : { host: 'testinghost', core: 'testingcore'} }

var testHostsFile = process.cwd() + '/test/work/testHosts.json';

var expect = require('chai').expect,
	hostLib = require('../src/node/lib/hosts.js').setConfig(program, testHostsFile, mockSolr);
var stats = require('./mock/checks.json');
	
suite("edgemanage tests", function() {
	
	test("advice", function testMustComment() {
    hostLib.getRotateAdvice(stats, hostLib.getHostsSummary());
  });
});


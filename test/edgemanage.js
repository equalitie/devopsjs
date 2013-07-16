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
	
suite("edgemanage tests", function() {
	
	test("must comment", function testMustComment() {
		var excepted = false;
		try {
			hostLib.mustComment();
		} catch (e) {
			excepted = true;
		}
		
	    expect(excepted).to.be.true;
	});
	
	test("add", function(done) {
		var newHost = 'testAdd';
		var hp = hostLib.addHost(newHost);
		hostLib.writeHosts(hp.hosts, program.add);
		var hosts = hostLib.getHosts();
		var found = null;
		
		for (var h in hosts) {
			if (hosts[h].name_s === newHost) {
				found = hosts[h];
			}
		}
    expect(found).is.not.null;
    done();
	});

	test("remove",function(done) {
		var remHost = 'testAdd';
		var logCall = false;
		var hp = hostLib.removeHost(remHost);
		hostLib.writeHosts(hp.hosts, remHost);
		var hosts = hostLib.getHosts();

		var found = null;
		
		for (var h in hosts) {
			if (hosts[h].name_s === remHost) {
				found = hosts[h];
			}
		}
    expect(found).is.null;
    expect(logCall).is.true;
    done();
	});

	test("flat hosts file", function() {
	});
	
	test("validateConfiguration", function() {
	});
		
		
	/*
	test("online", function() {
		var hp = hostLib.setOnline(program.online);
		hostLib.writeHosts(hp.hosts, program.online);
		console.log(program.online + ' is online');
	});
	
	test("offline", function() {
		var hp = hostLib.setOffline(program.offline);
		hostLib.writeHosts(hp.hosts, program.offline);
		console.log(program.offline + ' is offline');
	});
	
	test("activate", function() {
		var hp = hostLib.activate(program.activate);
		hostLib.writeHosts(hp.hosts, program.activate);
		console.log(program.activate + ' is active');
	});
	
	test("inactive", function() {
		var hp = hostLib.deactivate(program.deactivate);
		hostLib.writeHosts(hp.hosts, program.deactivate);
		console.log(program.deactivate + ' is inactive');
	});
	
	test("advice", function() {
		var num = program.timespan ? program.timespan :  hostLib.config.defaultPeriod;
		hostLib.getStats(num, hostLib.advise);
	});
	
	test("rotate", function() {
		var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
		hostLib.getStats(num, hostLib.rotate);
	});
	
	test("rotate in", function() {
		var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
		hostLib.getStats(num, hostLib.rotate);
	});
	
	test("rotate out", function() {
		var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
		hostLib.getStats(num, hostLib.rotate);
	});
	
	test("test host", function() {
		var check = require('./lib/nrpe/check.js');
		var test = require('./lib/nrpe/allchecks.js').getChecks(GLOBAL.hostTestName);
	
		check.checkEdge(program.testhost, test, GLOBAL.hostTestName, utils.getTick(), function(res) {
			console.log(res);
		});
	});
	
	test("query", function() {
		console.log(hostLib.getHostSummaries());
	});
	
	test("stats", function() {
		console.log(hostLib.getHostSummaries());
	});
	
	test("writeall", function() {
		var hp = hostLib.getHosts();
		hostLib.writeFlatHosts(hp.hosts, true, program.writeall);
	});*/
});



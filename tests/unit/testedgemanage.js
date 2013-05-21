#!/usr/bin/env node

var solrMock = {
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
	}
}

var program = {};

GLOBAL.CONFIG = { minActive: 6, flatHostsFile : 'edges.test', solrConfig : { host: 'testinghost', core: 'testingcore'} }

var hostLib = require('../../src/node/lib/hosts.js').setConfig(program, null, 1, solrMock);

function testMustComment() {
}

function testAdd() {
	hostLib.mustComment();
	var hp = hostLib.addHost(program.add);
	hostLib.writeHosts(hp.hosts, program.add);
	console.log(program.add + ' is added');
}

function testRemove() {
	hostLib.mustComment();
	var hp = hostLib.removeHost(program.remove, null, function(hp) {
		hostLib.writeHosts(hp.hosts, program.remove);
	});
	hostLib.writeHosts(hp.hosts, program.remove);
	console.log(program.remove + ' is removed');
}

function testOnline() {
	hostLib.mustComment();
	var hp = hostLib.setOnline(program.online);
	hostLib.writeHosts(hp.hosts, program.online);
	console.log(program.online + ' is online');
}

function testOffline() {
	hostLib.mustComment();
	var hp = hostLib.setOffline(program.offline);
	hostLib.writeHosts(hp.hosts, program.offline);
	console.log(program.offline + ' is offline');
}

function testActivate() {
	hostLib.mustComment();
	var hp = hostLib.activate(program.activate);
	hostLib.writeHosts(hp.hosts, program.activate);
	console.log(program.activate + ' is active');
}

function testInactivate() {
	hostLib.mustComment();
	var hp = hostLib.deactivate(program.deactivate);
	hostLib.writeHosts(hp.hosts, program.deactivate);
	console.log(program.deactivate + ' is inactive');
}

function testAdvice() {
	var num = program.timespan ? program.timespan :  hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.advise);
}

function testRotate() {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

function testRotateIn() {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

function testRotateOut() {
	hostLib.mustComment();
	var num = program.timespan ? program.timespan : hostLib.config.defaultPeriod;
	hostLib.getStats(num, hostLib.rotate);
}

function testTestHost() {
	var check = require('./lib/nrpe/check.js');
	var test = require('./lib/nrpe/allchecks.js').getChecks(GLOBAL.hostTestName);

	check.checkEdge(program.testhost, test, GLOBAL.hostTestName, utils.getTick(), function(res) {
		console.log(res);
	});
}

function testQuery() {
	console.log(hostLib.getHostSummaries());
}

function testStats() {
	console.log(hostLib.getHostSummaries());
}

function testWriteall() {
	var hp = hostLib.getHosts();
	hostLib.writeFlatHosts(hp.hosts, true, program.writeall);
}

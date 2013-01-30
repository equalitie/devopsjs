#!/usr/bin/env node

var program = require('commander');

program
  .version('0.0.1')
  .option('-a, --activate <edge>', ' make edge active')
  .option('-d, --deactivate <edge>', 'make edge inactive')
  .option('-m, --maintout <edge>', 'remove for maintenance')

	.option('-t, --test <edge', 'test an edge')
  .option('-d, --delete <edge>', 'delete from configuration')
  .option('-a, --add <edge>', 'add to configuration')

  .option('-r, --reason \'description\'', 'reason for the action')
	.option('-i, --incident', 'file as an incident report')
  .parse(process.argv);

var edges = require('./edges.json');

if (program.test) {
	var nrpe = require('./lib/nrpe/check.js');
	var nrpeChecks = require('./lib/nrpe/allchecks.js').getChecks('fail2ban')[0];
	nrpe.checkEdge(program.test, nrpeChecks, nrpe.getTick(), function(res) {
		console.log(res);
		});
}


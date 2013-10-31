#!/usr/bin/env node

var chai = require('chai'),
expect = chai.expect,
assert = chai.assert,
utils = require('../src/node/lib/util.js'),
configFile = 'config/localSettings.js'; // global config

setup(function(done){
  utils.config();
  done();
});

test('GLOBAL.CONFIG', function testGlobalConfig() {
  expect(GLOBAL.CONFIG).to.be.a('object', 'Define '+ configFile);
});

describe('String variables', function() {
  ['domain', 'defaultDNET', 'httpCheckURI'].forEach(function(v) {
    it('must have the string variable ' + v, function() {
      expect(GLOBAL.CONFIG[v]).to.be.a('string', 'define string ' + v + ' in ' + configFile);
    });
  });
});

describe('Wiki config', function() {
  it('must have wiki configured', function() {
    assert.isObject(GLOBAL.CONFIG.wikiConfig);
    assert.isString(GLOBAL.CONFIG.wikiConfig.server, 'wikiConfig.server is configured');
    assert.isString(GLOBAL.CONFIG.wikiConfig.protocol, 'wikiConfig.protocol is configured');
    assert.isString(GLOBAL.CONFIG.wikiConfig.path, 'wikiConfig.path is configured');
    assert.isString(GLOBAL.CONFIG.wikiConfig.username, 'wikiConfig.username is configured');
    assert.isString(GLOBAL.CONFIG.wikiConfig.password, 'wikiConfig.password is configured');
  });
});

describe('ElasticSearch config', function() {
  it('must have ElasticSearch configured', function() {
    assert.isObject(GLOBAL.CONFIG.elasticSearchConfig);
    assert.isString(GLOBAL.CONFIG.elasticSearchConfig._index, 'elasticSearchConfig._index is configured');
    assert.isObject(GLOBAL.CONFIG.elasticSearchConfig.server, 'elasticSearchConfig.server is configured');
    assert.isString(GLOBAL.CONFIG.elasticSearchConfig.server.host, 'elasticSearchConfig.server.host is configured');
    assert.isNumber(GLOBAL.CONFIG.elasticSearchConfig.server.port, 'wikiConfig.server.port is configured');
  });
});

describe('Transport config', function() {
  it('must have a message transport', function() {
    assert.isObject(GLOBAL.CONFIG.notify);
    assert.isString(GLOBAL.CONFIG.notify.emailSubject, 'notify emailSubject');
    assert.isString(GLOBAL.CONFIG.notify.emailFrom, 'notify emailFrom');
    assert.isObject(GLOBAL.CONFIG.notify.notifyTransport);
    assert.isFunction(GLOBAL.CONFIG.notify.notifyTransport.sendNotification, 'sendNotification function exists');
  });
});

describe('dnet configurations', function() {
  it('must have DNets configured', function() {
    assert.isArray(GLOBAL.CONFIG.dnets, 'Define dnets in ' + configFile);
    GLOBAL.CONFIG.dnets.forEach(function(dnet) {
      utils.config({dnet:dnet});
      assert(GLOBAL.CONFIG.DNET, dnet, 'configured for ' + dnet);
      describe(dnet + ' configuration', function() {
        ['minActive', 'rotationTimeMinutes'].forEach(function(v) {
          it('must have the numeric variable ' + v, function testNumericVariable() {
            expect(GLOBAL.CONFIG[v]).to.be.a('number', 'define number ' + v + ' in ' + configFile);
          });
        });
        ['flatHostsFile'].forEach(function(v) {
          it('must have the string variable ' + v, function() {
            expect(GLOBAL.CONFIG[v]).to.be.a('string', 'define string ' + v + ' in ' + configFile);
          });
        });
      });
    });
  });
});

#!/usr/bin/env node

var chai = require('chai'),
expect = chai.expect,
assert = chai.assert,
utils = require('../src/node/lib/util.js'),
configFile = 'config/localSettings.js'; // global config

describe('Configuration tests', function() {
  utils.config();

  describe('GLOBAL.CONFIG', function testGlobalConfig() {
    assert(GLOBAL.CONFIG,'object', 'Define '+ configFile);
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
      assert.isString(GLOBAL.CONFIG.wikiConfig.server, 'define wikiConfig.server');
      assert.isString(GLOBAL.CONFIG.wikiConfig.protocol, 'define wikiConfig.protocol');
      assert.isString(GLOBAL.CONFIG.wikiConfig.path, 'define wikiConfig.path');
      assert.isString(GLOBAL.CONFIG.wikiConfig.username, 'define wikiConfig.username');
      assert.isString(GLOBAL.CONFIG.wikiConfig.password, 'define wikiConfig.password');
    });
  });

  describe('ElasticSearch config', function() {
    it('must have ElasticSearch configured', function() {
      assert.isObject(GLOBAL.CONFIG.elasticSearchConfig);
      assert.isString(GLOBAL.CONFIG.elasticSearchConfig._index, 'define elasticSearchConfig._index');
      assert.isObject(GLOBAL.CONFIG.elasticSearchConfig.server, 'define elasticSearchConfig.server');
      assert.isString(GLOBAL.CONFIG.elasticSearchConfig.server.host, 'define elasticSearchConfig.server.host');
      assert.isNumber(GLOBAL.CONFIG.elasticSearchConfig.server.port, 'define wikiConfig.server.port');
    });
  });

  describe('Transport config', function() {
    it('must have a message transport', function() {
      assert.isObject(GLOBAL.CONFIG.notify);
      assert.isString(GLOBAL.CONFIG.notify.emailSubject, 'define notify emailSubjectconfigured');
      assert.isString(GLOBAL.CONFIG.notify.emailFrom, 'define notify emailFrom');
      assert.isObject(GLOBAL.CONFIG.notify.notifyTransport);
      assert.isFunction(GLOBAL.CONFIG.notify.notifyTransport.sendNotification, 'define sendNotification function');
    });
  });

  describe('dnet configurations', function() {
    it('must have DNets configured', function() {
      assert.isArray(GLOBAL.CONFIG.dnets, 'define dnets in ' + configFile);
      GLOBAL.CONFIG.dnets.forEach(function(dnet) {
        utils.config({dnet:dnet});
        assert(GLOBAL.CONFIG.DNET, dnet, 'define for ' + dnet);
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
});


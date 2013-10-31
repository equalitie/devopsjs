#!/usr/bin/env node

var chai = require('chai');
var expect = chai.expect;
var utils = require('../src/node/lib/util.js');
var configFile = 'config/localSettings.js'; // global config

  setup(function(done){
    utils.config();
    done();
  });

  test('GLOBAL.CONFIG', function testGlobalConfig() {
    expect(GLOBAL.CONFIG).to.be.a('object', 'Define '+ configFile);
  });

  describe('String variables', function() {
    ['flatHostsFile', 'domain', 'defaultDNET', 'httpCheckURI'].forEach(function(v) {
      it('must have the string variable ' + v, function() {
        expect(GLOBAL.CONFIG[v]).to.be.a('string', 'define string ' + v + ' in ' + configFile);
      });
    });
  });
	
  describe('Numeric variables', function() {
    ['minActive', 'rotationTimeMinutes'].forEach(function(v) {
      it(v, function testNumericVariable() {
        expect(GLOBAL.CONFIG[v]).to.be.a('number', 'define number ' + v + ' in ' + configFile);
      });
    });
  });


  /*
  c.dnets = ['deflect1.deflect.ca', 'staging.deflect.ca'];
  c.notify = {emailSubject : '[eqwiki] Ticket notifications',
    emailFrom : 'david@equalit.ie'
  };

  var transport = {
      sendNotification : function(msg, callback) {
            msg.html = msg.html.substr(0, Math.min(msg.html.length, 20));
                msg.text = msg.text.substr(0, Math.min(msg.text.length, 20));
                    console.log('TRANSPORT', msg); callback();
                      },
                        close : function() {}
  };

  c.wikiConfig = {
      server: 'wiki.equalit.ie',
        protocol: 'https',
          path: '/mediawiki',
            username: 'Bot',
              password: 'wookieCookie1212',
                debug: false
  }

  c.elasticSearchConfig = {
      _index : 'devopsjs',
        server : {
                host : 'lilpad.zooid.org',
                      port : 9200
                        }

*/

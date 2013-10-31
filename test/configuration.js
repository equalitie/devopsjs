#!/usr/bin/env node

var chai = require('chai');
var expect = chai.expect;
var utils = require('../src/node/lib/util.js');

suite("configuration tests", function() {
  setup(function(done){
    utils.config();
    done();
  });

  test('GLOBAL.CONFIG', function testGlobalConfig() {
    expect(GLOBAL.CONFIG).to.be.notnull;
  });
  test("flatHostsFile", function testFlatHostsFile() {
    expect(GLOBAL.CONFIG.flatHostsFile).to.be.a.string;
  });
	
  /*
  c.flatHostsFile = 'edges.live';
  c.minActive = 6;
  c.dnets = ['deflect1.deflect.ca', 'staging.deflect.ca'];
  c.domain = '.deflect.ca';
  c.defaultDNET = 'deflect1';

  c.httpCheckURI = 'http://www.equalit.ie/10k';


  c.rotationTimeMinutes = 60;

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
});

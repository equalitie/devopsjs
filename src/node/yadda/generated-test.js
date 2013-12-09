var  b = require('devopsjs-bdd-cases');
var utils = require('../lib/util.js');
utils.config();

b.execFeatures('src/node/yadda/generated/', { dnetServers: { cname: GLOBAL.CONFIG.dnets[0] }}); // FIXME


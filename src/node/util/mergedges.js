var staging = require('/home/devopsjs/n/devopsjs/config/hosts.staging.json');
var deflect1 = require('/home/devopsjs/n/devopsjs/config/hosts.deflect1.json');
var vz = require('/home/devopsjs/n/devopsjs/config/hosts.vz.json');

var all = deflect1;
all = all.concat(staging);
all = all.concat(vz);

console.log(JSON.stringify(all, null, '  '));

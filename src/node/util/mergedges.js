var deflect1 = require('/usr/local/devopsjs/deflect1//hosts.json');
var staging = require('/usr/local/devopsjs/staging/hosts.json');

var all = deflect1;
all = all.concat(staging);

console.log(JSON.stringify(all, null, '  '));

var hosts = require('/home/devopsjs/n/devopsjs/config/hosts.json');

function get(q, hosts, dnet) {
  var r = null;
  for (var h in hosts) {
    var host = hosts[h]
    if (host.hostname == q){
      if (host.dnetChange) {
        r = host.dnet + ' (' + dnet + ') ' + Math.round((new Date().getTime() - new Date(host.dnetChange).getTime())/1000) + " seconds ago";
      } else {
        r = "no data";
      }
      return r;
      break;
    }
  }
}

var host = process.argv[2];

var r = get(host, hosts, 'deflect1');
if (r) {
  console.log(r);
} else {
  r = get(host.replace(/\./, '.staging.'), hosts, 'staging');
  if (r) {
    console.log(r);
  } else {
    console.log("host not found");
  }
}

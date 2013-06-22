var stats= require('./june-13-to-15.json');
console.log(stats.response.docs.length);

var a = {};
var bytes = 0;
stats.response.docs.forEach(function(s) {
  if (a[s.edge_s]) {
    a[s.edge_s] = a[s.edge_s] + 1;
  } else {
    a[s.edge_s] = 1;
  }
  bytes += s.bytesPerSecond_i;
});
console.log('total', bytes, 'bytes', bytes / (1024*1024), 'MB', a);

var queue = require('queue-async');
var getStatsQueue = queue();
var solr = require('solr-client');
var solrClient = solr.createClient({ host: 'ovh1.deflect.ca', core: 'core0'});


for (var edge in a) {
  getStatsQueue.defer(function(callback) {
    var q = 'edge_s:' + edge + ' AND bytesPerSecond_i:* AND tickDate_dt:[2013-06-13T23:00:00.000Z TO 2013-06-16T23:00:00.000Z]';
    var statsQuery = solrClient.createQuery()
      .q(q).sort({bytesPerSecond_i:'desc'});
      solrClient.search(statsQuery, callback);
  });
}

getStatsQueue.awaitAll(function(err, results) {
  if (err) {
    throw err;
  }
  results.forEach(function(r) {
    r.response.docs.forEach(function(d) {
      console.log(d.edge_s, '|', d.bytesPerSecond_i, '|', d.tickDate_dt);
    });
  });
});


var solr = require('solr-client');

var client = solr.createClient({ host: 'lilpad.zooid.org', core: 'core0'});
client.autoCommit = true;

exports.query = function(callback) {
  var query = client.createQuery()
     .q({aCheck_s : '*'})
     .start(0)
     .sort({aCheck_s:'asc', tickDate_dt: 'desc', edge_s : 'asc'})
     .rows(900);

  client.search(query,function(err,res) {
     if(err){
      console.log(err);
      return null;
     } else {
      callback.writeTable(res);
     }
  });
}

exports.commit = function(docs) {
	console.log("commiting " + docs.length + " docs");
	docs.forEach(function(f) { process.stdout.write(f.id + " ");});
    client.add(docs, function(err,obj){
        if(err){
           throw "commit ERROR: " + err;
        } else {
           //console.log(obj);
        }
  });
}



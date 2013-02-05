var solr = require('solr-client');

var client = solr.createClient({ host: 'localsolr', core: 'core1'});
console.log(client);
client.autoCommit = true;

exports.query = function(callback) {
  var queryNRPEResults = client.createQuery()
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
	docs.forEach(function(f) { console.log(f.id + " ");});
console.log(client);
    client.add(docs, function(err,obj){
        if(err){
           throw "commit ERROR: " + err;
        } else {
           //console.log(obj);
        }
  });
}

exports.setLastClassTick = function(c, tick) {
    classTick = { id : c + "/lastTick", class_s : 'Class tick', className_s : c, tickTime_l: tick.tickTime, tickDate_dt : tick.tickDate};
    console.log(classTick);
    this.commit([classTick]);
}


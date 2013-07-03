var solr = require('solr-client');

require("../../../config/localConfig.js");
var solrClient = solr.createClient(GLOBAL.CONFIG.solrConfig);
solrClient.autoCommit = true;

exports.query = function(callback) {
  var queryNRPEResults = solrClient.createQuery()
     .q({aCheck_s : '*'})
     .start(0)
     .sort({aCheck_s:'asc', tickDate_dt: 'desc', edge_s : 'asc'})
     .rows(900);

  solrClient.search(query,function(err,res) {
     if(err){
      console.log(err);
      return null;
     } else {
      callback.writeTable(res);
     }
  });
}

exports.commit = function(docs) {
//	docs.forEach(function(f) { console.log(f.id + " ");});
    solrClient.add(docs, function(err,obj){
        if(err){
					console.log(solrClient);
           throw "commit ERROR: " + err;
        } else {
           //console.log(obj);
        }
  });
}

exports.setLastClassTick = function(c, tick) {
    classTick = { id : c + "/lastTick", class_s : 'Class tick', className_s : c, tickTime_l: tick.tickTime, tickDate_dt : tick.tickDate};
    this.commit([classTick]);
}



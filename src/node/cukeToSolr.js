#! /usr/bin/env node

// transform cucumber json output into solr results

var inputStream = process.stdin
  , data = '';

var solr = require('solr-client');

var client = solr.createClient({ host: 'lilpad.zooid.org', core: 'core0'});
client.autoCommit = true;

process.stdin.resume();
 
inputStream.on('data', function(chunk) {
  data += chunk;
});
 
inputStream.on('end', function() {
  var json = JSON.parse(data);
  processResult(json[0]);
});

function processResult(a) {
    for (var i = 0; i < a.elements.length; i++) {
        var e = a.elements[i];
        console.log("\n" + e.name + ":");
        for (var j = 0; j < e.steps.length; j++) {
            var s = e.steps[j];
            if (s.result) {
                console.log(s.keyword + s.name + ": " + s.result.status);
                if (s.result.status == 'failed') {
                  console.log(s.result.error_message);
                }
            } else {
                console.log("no result in " + console.dir(s));
            }
        }
    }
}

function add(docs) {
    client.add(docs, function(err,obj){
        if(err){
           throw "commit ERROR: " + err;
        } else {
           //console.log(obj);
        }
  });
}


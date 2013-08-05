#! /usr/bin/env node

// transform cucumber json output into solr results
// TODO port to ElasticSearch

var inputStream = process.stdin
  , data = '';

var store = require('./lib/solrNagios.js');
var util = require('./lib/util.js');

var thisTick = util.getTick();

// consume stdin

process.stdin.resume();
 
inputStream.on('data', function(chunk) {
  data += chunk;
});
 
inputStream.on('end', function() {
  try {
  	var json = JSON.parse(data);
	} catch (e) {
    console.log("failing: ", e, data);
    throw e;
	}
  processResult(json[0]);
});

function processResult(a) {
    var feature = a.name;
    store.setLastClassTick('Test feature/' + feature, thisTick);
    for (var i = 0; i < a.elements.length; i++) {
        var e = a.elements[i];
        if (e.keyword === 'Scenario') {
            var scenario = e.name;
            steps = [];
            for (var j = 0; j < e.steps.length; j++) {
                var s = e.steps[j];
                var stepName = s.keyword + s.name;
                var step = {class_s : 'Test step', id: feature + "/" + scenario + "/" + stepName + "/" + thisTick.tickTime, tickDate_dt: thisTick.tickDate};
                if (s.result) {
                    step.keyword_s = s.keyword;
                    step.name_s = s.name;
                    step.status_s = s.result.status;
                    if (s.result.status == 'failed') {
                        step.error_s = s.result.error_message;
                    }
                } else {
                    step.result_s = "none";
                }
                steps.push(step);
            }
            console.log(steps);
            commit(steps);
        }
    }
}
function commit(docs) {
  store.commit(docs);
}


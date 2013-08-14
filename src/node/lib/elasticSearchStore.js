var elasticsearch = require('elasticsearch')
 , es = elasticsearch(GLOBAL.CONFIG.elasticSearchConfig);

/**
*
* Index (create or update) documents. uses Bulk call
*
*/

exports.index = function(options, docs, callback) {
  if (!Array.isArray(docs)) { docs = [docs] };
console.log('inserting', docs.length, options._type);
  var tc = [];
  docs.forEach(function(d) {
    tc.push({ index : options});
    tc.push(d);
  });
console.log(tc);
  es.bulk(tc, function (err, data) {
    if (err) {
      console.log('on', options, docs);
      throw (err);
    }
    if (callback) callback();
  });
}

exports.search = function(options, query, callback) {
  es.search(options, query, callback);
}


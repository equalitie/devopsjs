/**
 *
 * Creator: DavidM
 * Retrieve static BDD tests from wiki for processing
 *
 **/

var fs = require('fs');
var utils = require( "./lib/util.js");
utils.config();

var semwiki = require("./lib/semwiki.js");

var wiki = semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, processTests);

function processTests() {
  var params = {
    action: 'ask',
    query: '[[Test item type::+]]|?Test item page|?Test item type|?Test item description|?Test item content|?Test item tags|sort=Test item type'
  };

  semwiki.call(params, function(info, next, data) {
    processTestItems(data);
  });
}

function processTestItems(data) {
  var features = {};
    
  for (var r in data.query.results) {
    var result = data.query.results[r].printouts;
    var page = result['Test item page'][0].fulltext;
    var type = result['Test item type'][0].fulltext;
    var desc = result['Test item description'][0].fulltext;
    var content = result['Test item content'][0].split("\n");
    
    var feature = features[page] || "";
    feature += type + ": " + desc + "\n  " + content.join("\n  ") + "\n\n";
    features[page] = feature;
  }
  for (var k in features) {
    if (features.hasOwnProperty(k)) {
      writeFeature(k, features[k]);
    }
  }
}

function writeFeature(name, feature) {
  name += ".generated.feature";
  console.log("writing tests/features/" + name);
  fs.writeFileSync("tests/features/" + name, feature);
}



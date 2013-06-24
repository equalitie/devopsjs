var fs = require('fs');
var utils = require( "./lib/util.js");
var semwiki = require("./lib/semwiki.js");

var wiki = semwiki.getWiki("../../"+utils.confFile, processTests);

function processTests() {

  var params = {
    action: 'ask',
    query: '[[Test item type::+]]|?Test item page|?Test item type|?Test item description|?Test item content|?Test item tags|sort=Test item type'
  };

	semwiki.call(params, function(info, next, data) {
    processTestItems(data);
  });

//  wikibot.getAsk({ query: "[[Test item type::+]]|?Test item page|?Test item type|?Test item description|?Test item content|?Test item tags|sort=Test item page|sort=Test item type"}, processTestItems);
}

function processTestItems(data) {
  var features = {};

  for (var r in data.query.results) {
//    var b = data.info.results[r]['printouts'];
    var b = data.query.results[r]['printouts'];
    var page = b['Test item page'][0].fulltext;
    var type = b['Test item type'][0].fulltext;
    var desc = b['Test item description'][0].fulltext;
    var content = b['Test item content'][0].split("\n");

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



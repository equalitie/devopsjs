var bot = require('nodemw').bot;
var fs = require('fs');
var utils = require( "./lib/util.js");

var wiki = getWiki();

function getWiki() {
  require("../../"+utils.confFile);
  var wikiConfig = GLOBAL.CONFIG.wikiConfig;

  var wikibot = new bot(wikiConfig);

  wikibot.logIn(function() {
    processTests(wikibot);
  });
}

function processTests(wikibot) {
/*
  var params = {
    action: 'ask',
    query: '[[Test item type::+]]|?Test item page|?Test item type|?Test item description|?Test item content|?Test item tags|sort=Test item type'
  };

	wikibot.api.call(params, function(info, next, data) {
 		console.log("call:", data && data.query && data.query.results);
  });
*/

  wikibot.getAsk({ query: "[[Test item type::+]]|?Test item page|?Test item type|?Test item description|?Test item content|?Test item tags|sort=Test item page|sort=Test item type"}, processTestItems);
}

function processTestItems(data) {
  var features = {};

var i = 0;
  for (var r in data.info.results) {
//    var b = data.info.results[r]['printouts'];
    var b = data.info.results[r]['printouts'];
console.log(b);
console.log("here", i++);
console.log(b['Test item page']);
    var page = b['Test item page'][0].fulltext;
console.log("here", i++);
    var type = b['Test item type'][0].fulltext;
console.log("here", i++);
    var desc = b['Test item description'][0].fulltext;
console.log("here", i++);
    var content = b['Test item content'][0].split("\n");
console.log("here", i++);

    var feature = features[page] || "";
console.log('feature', feature);
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



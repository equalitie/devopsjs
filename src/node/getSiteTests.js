/**
 *
 * Creator: DavidM
 * Retrieve templated site BDD tests from wiki for processing
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
    query: '[[Site of::+]]|?Site of|?Address|?Aliases|?Expected term|?Nocache address|?Exclude locations|?Status'
  };

  semwiki.call(params, function(info, next, data) {
    processTestItems(data);
  });
}

function processTestItems(data) {
  var templates = {};

  for (var r in data.query.results) {
    var result = data.query.results[r].printouts;

    var vars = {
      siteOf : result['Site of'][0].fulltext,
      address : result.Address[0],
      aliases : result.Aliases.length ? result.Aliases[0] : null,
      expectedTerm : result['Expected term'][0],
      nocacheAddress : result['Nocache address'].length ? result['Nocache address'][0].fulltext : null,
      excludeLocations : result['Exclude locations'].length ? result['Exclude locations'][0].split('\n') : null,
      status : result.Status[0]
    };

    var file = encodeURIComponent(vars.siteOf) + '#' + encodeURIComponent(vars.address);
    var feature = "Feature: Test " + vars.address + '\n';

    ['address', 'aliases', 'validatePage', 'excludeLocations', 'expectedTerm', 'nocacheAddress'].forEach(function(test) {
      if (vars[test]) {
        if (!templates[test]) {
          templates[test] = fs.readFileSync('./yadda-tests/templates/' + test);
        }
        var text = templates[test];
        ['address', 'aliases', 'excludeLocations',  'expectedTerm', 'nocacheAddress', 'validatePage'].forEach(function(poss) {
          text = text.toString().replace('@'+poss+'@', vars[poss]);
        });
        feature += (text + '\n');
      }
    });
    writeFeature(file, feature);
  }
}

function writeFeature(name, feature) {
  name += ".feature";
  console.log("writing yadda-tests/generated/" + name);
  fs.writeFileSync("yadda-tests/generated/" + name, feature);
}



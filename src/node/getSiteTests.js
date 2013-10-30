/**
 *
 * Creator: DavidM
 * Retrieve templated site BDD tests from wiki for processing
 * Updated 21/10/2013
 * Cormac
 **/
var fs = require('fs');

//  give us some of the nice object iterators
var _ = require('lodash');
var FS = require('q-io/fs');
var util = require('./lib/util.js');
util.config();

var hostLib = require('./lib/hosts.js');

var allDNETs = demerge(hostLib.getDNET('MERGED'));

var semwiki = require("./lib/semwiki.js");

var wiki = semwiki.getWiki(GLOBAL.CONFIG.wikiConfig, processTests);


function processTests() {
  var query = '[[Site of::+]]|?Site of|?Address|?Aliases|?Expected term|' +
              '?Nocache address|?Exclude locations|?Status|?DNET';
  var params = {
    action: 'ask',
    query: query
  };

  semwiki.call(params, function(info, next, data) {
    processTestItems(data);
  });
}

/**
 * a list of all the possible test types
 * these should match the templates in yadda-tests/templates
 * @type {Array}
 */
var testTypes = [
  'address',
  'aliases',
  'validatePage',
  'excludeLocations',
  'expectedTerm',
  'nocacheAddress'
];

var rootDir     = require("path").resolve(__dirname),
    templateDir = rootDir + '/yadda-tests/templates/',
    outputDir   = rootDir + '/yadda-tests/generated/';


/**
 * process each of the testItems retrieved from the wiki
 * @param data
 */
var processTestItems = function (data) {
  _.each(data.query.results, processResult);
};

/**
 * main runloop for our test generation this is an iterator that runs over each result
 * from the query to the wiki for tests
 * Generates vars (context) for each test
 * Generates the test file
 * Writes the test file to the file system
 *
 * @param testItem
 */
var processResult = function (testItem) {
  var vars, result, filename, featureHeader, templates, generatedTests;
  result = testItem.printouts;
  vars = mapPrintoutToVars(result);
  filename = generateFileName(vars);
  featureHeader = generateFeatureHeader(vars);

  // create a mapping from test types to their template files
  templates = testTypes.reduce(convertTestTypeToFile.bind(vars), {});

  generatedTests = _.map(templates, mapTemplateToTest, vars);
  generatedTests = featureHeader + generatedTests.join('\n') + '\n';
  writeFeature(filename, generatedTests, vars);

};

var mapTemplateToTest = function (template, testType) {
  return template.toString().replace('@' + testType + '@', this[testType]);
};

/**
 * map a list of test types to their template files, receives the vars object as context
 * @param templatesObject
 * @param testType
 * @returns {*}
 */
var convertTestTypeToFile = function (templatesObject, testType) {
  if (this[testType]) {
    templatesObject[testType] = fs.readFileSync(templateDir + testType);
  }
  return templatesObject;
};

/**
 * create a context for the test
 * TODO convert each of the RHS value generation statements into a function
 * @param result
 * @returns {{siteOf: *, address: *, aliases: *, expectedTerm: *, nocacheAddress: *, excludeLocations: (Array|*), status: *}}
 */
var mapPrintoutToVars = function (result) {
  var dnet = result.DNET[0] ? result.DNET[0].fulltext.toLowerCase() : GLOBAL.CONFIG.defaultDNET;
  var dnetHosts = allDNETs[dnet];
  return {
    siteOf : result['Site of'][0].fulltext,
    address : unprefixedAddress(result.Address[0]),
    aliases : formatAliases(result.Aliases[0]),
    expectedTerm : result['Expected term'][0],
    nocacheAddress : result['Nocache address'].length ? result['Nocache address'][0].fulltext : null,
    excludeLocations : result['Exclude locations'].length ? result['Exclude locations'][0].split('\n') : [],
    status : result.Status[0],
    DNET : dnet,
    dnetHosts : dnetHosts
  };
};

/**
 * return the address without http:// or any other protoclol
 * @param address
 * @returns {*|XML|replace|parameterizedNumbersStepName.replace|stepName.replace|string}
 */
var unprefixedAddress = function(address) {
  return address.replace(/.*?:\/\//g, '')
                .replace(/\/+$/, '');
};

var formatAliases = function (aliases) {
  if (aliases) {
    aliases = aliases.replace(' ', '');
    aliases = aliases.split(',');
    return aliases.map(function (alias) {
      return alias.replace(/\.+$/, '');
    });
  }
  else return [];
};
/**
 * Return a filename for the generated feature
 * @param vars
 * @returns {string}
 */
var generateFileName = function (vars) {
  return encodeURIComponent(vars.siteOf) + '#' + encodeURIComponent(vars.address);
};

/**
 * return a header for the feature
 * @param vars
 * @returns {string}
 */
var generateFeatureHeader = function (vars) {
  return "Feature: Test " + vars.address + '\n';
};

// write the context for each test to a file
var writeContextFile = function (baseDir, vars) {
  return FS.read(templateDir + 'context.tpl')
    .then(function(templateString) {
      var contextTemplate = _.template(templateString);
      return FS.write(
        baseDir + '/context.js',
        contextTemplate(
          {vars: JSON.stringify(vars)}
        )
      );
    });
};

/**
 * write a directory for each test containing the test feature and a context
 * to be provided to each feature in the format of json file
 * @param name
 * @param feature
 * @param vars
 */
function writeFeature(name, feature, vars) {
  var baseDir = outputDir + name;

  FS.removeTree(baseDir)
    .then(function (){
      return FS.makeDirectory(baseDir);
    })
    .fail(function(err) {
      return FS.makeDirectory(baseDir);
    })
    .then(function (){
      return FS.write(baseDir + '/site.feature', feature);
    })
    .then(function () {
      return writeContextFile(baseDir, vars);
    })
    .fail(function (err) {
      console.log(err + '\n test generation failed');
    })
    .done(function() {
      //console.log("yadda-tests/generated/" + name + "/site.feature written");
    });

}

function demerge(merged) {
  var unmerged = {};
  GLOBAL.CONFIG.dnets.forEach(function(d) { unmerged[d.replace(GLOBAL.CONFIG.domain, '')] = []; });
  merged.forEach(function(m) {  // copy interesting properties from last iteration
    if (unmerged[m.DNET]) {
      unmerged[m.DNET.replace(GLOBAL.CONFIG.domain, '')].push(m);
    }
  });
  return unmerged;
}


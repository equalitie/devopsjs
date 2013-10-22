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
var FS = require('Q-io/fs');
var utils = require( './lib/util.js');
utils.config();

var semwiki = require('./lib/semwiki.js');

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

/**
 * a list of all the possible test types
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

// template directory for the scenario tests
var templateDir = './yadda-tests/templates/';


/**
 * process each of the testItems retrieved from the wiki
 * @param data
 */
var processTestItems = function (data) {
  _.each(data.query.results, processResult);
};

/**
 * main run loop for our test generation this is an iterator that runs over each result
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
  return {
    siteOf : result['Site of'][0].fulltext,
    address : result.Address[0],
    aliases : result.Aliases.length ? result.Aliases[0] : null,
    expectedTerm : result['Expected term'][0],
    nocacheAddress : result['Nocache address'].length ? result['Nocache address'][0].fulltext : null,
    excludeLocations : result['Exclude locations'].length ? result['Exclude locations'][0].split('\n') : null,
    status : result.Status[0]
  };
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
  return 'Feature: Test ' + vars.address + '\n';
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
  var baseDir = 'yadda-tests/generated/' + name;

  FS.removeTree(baseDir)
    .then(function (){
      return FS.makeDirectory(baseDir);
    })
    .fail(function() {
      return FS.makeDirectory(baseDir);
    })
    .then(function (){
      return FS.write(baseDir + '/site.feature', feature);
    })
    .then(function () {
      return writeContextFile(baseDir, vars);
    })
    .fail(function () {
      console.log(name + ' test generation failed');
    })
    .done(function() {
      console.log('yadda-tests/generated/' + name + '/site.feature written');
    });

}

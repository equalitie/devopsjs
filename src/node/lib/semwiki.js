var bot = require('nodemw');

/* 

Semantic wiki functions 

*/

var wikibot;
var loggedIn = false;

var semwiki = {
  getWiki : function(wikiConfig, callback) {
    wikibot = new bot(wikiConfig);
    wikibot.logIn(function() {
      loggedIn = true;
      callback();
    });
  }, 

  call : function(params, callback) {
    wikibot.api.call(params, callback);
  },

  getUsers : function(callback) {
    var params = {
      action: 'ask',
      query: '[[Category:User]]|?Contact address|?Current activity|?Planned activity|?Modification date|sort=Modification date'
    };

    semwiki.call(params, function(info, next, data) {
      callback(data.query.results);
    });
  },
  getTickets : function(spec, callback) {
    var params = {
      action: 'ask',
      query: '[[Category:Ticket tracker]]' + spec + '|?Assigned to|?Contact|?Date created|?Description|?Ticket for|?Importance|?Project|?Ticket status|?Validator|?Last update|?Importance|?Modification date|sort=Importance|limit=5000'
    };

    semwiki.call(params, function(info, next, data) {
      callback(data.query.results);
    });

  },
  val : function(result, field){
    var ret = [];
//console.log(field, result.printouts[field]);
    result.printouts[field].forEach(function (v) {
      ret.push(v.fulltext || v);
    });
    return ret;
  }
}

module.exports = semwiki;


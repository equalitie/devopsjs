var bot = require('nodemw');

/* 

Semantic wiki functions 

*/

var wikibot;
var loggedIn = false;

var semwiki = {
  getWiki : function(wikiConfig, callback) {
		if (!loggedIn) {
      wikibot = new bot(wikiConfig);
      wikibot.logIn(function() {
        loggedIn = true;
				callback();
      });
		} else {
			callback();
		}
  }, 

  call : function(params, callback) {
    wikibot.api.call(params, callback);
  },

  getUsers : function(callback) {
    var params = {
      action: 'ask',
      query: '[[Category:User]]|?Contact address|?Current activity|?Planned activity|?Modification date|?Watchwords|sort=Modification date'
    };

    semwiki.call(params, function(info, next, data) {
      callback(data.query.results);
    });
  },
	getWikibot : function() {
		return wikibot;
	},
  getTickets : function(spec, callback) {
    var params = {
      action: 'ask',
      query: spec + '|?Assigned to|?Contact|?Date created|?Date required|?Description|?Ticket for|?Importance|?Project|?Ticket status|?Validator|?Last update|?Last provider|?Last comment|?Importance|?Modification date|sort=Modification date|order=desc,desc'
    };

    semwiki.call(params, function(info, next, data) {
      callback(data.query.results);
    });

  },
  date : function(result, field){
    var ret = [];
    if (!result.printouts[field]) {
      return ret;
    }
    result.printouts[field].forEach(function (v) {
      ret.push(v > 0 ? new Date(v * 1000) : null);
    });
    return ret;
  },
  dateSeconds : function(result, field){
    var ret = [];
    if (!result.printouts[field]) {
      return ret;
    }
    result.printouts[field].forEach(function (v) {
      ret.push(v > 0 ? v * 1000  : null);
    });
    return ret;
  },
  val : function(result, field){
    var ret = [];
    if (!result.printouts[field]) {
      return ret;
    }
    result.printouts[field].forEach(function (v) {
      ret.push(v.fulltext || v);
    });
    return ret;
  }
}

module.exports = semwiki;


function findHosts() {
  if ($('.devopsHost').length) {
    include("/dojs/jquery.sparkline.min.js");
    doHosts();
  }
}

function doHosts() {
  setTimeout(doHosts, 6000);
console.log('doHosts', new Date());

  $('.devopsHost').each(function() { // iterate over hosts
      var t = $(this);
      var name = t.find('.name').text();
      solrQuery('name_s:'+name, function(data) {  // get summary
        var values = {}, high = {}, low = {};
        var res = data.response.docs[0];
        if (!res) {
          console.log('no results for host', name);
          return;
        }
	    var offline = res.offline_s && res.offline_s == 'true';
	    var status = offline ? 'offline ' : 'available ';
	    if (!offline) {
	      status += res.rotatedOut_s || res.rotatedOut_s == 'true' ? 'rotated' : 'in';
	    }
	    t.find('.status').html(status);
	    t.find('.checkDate').html(prettyDate(res.tickDate_dt));
	    var checks = {tcptraffic : ['bytesPerSecond_i'], fail2ban : ['httpBans_i', 'sshBans_i'], connections : ['established_i', 'waiting_i', 'listeners_i']};
	    for (var check in checks) {
	      var fields = checks[check];
	
	      for (var f in fields) {
		    var field = fields[f];
		    values[check] = [];
		    high[check] = 0;
		    low[check] = 0;
		    solrQuery('edge_s:' + name + ' AND aCheck_s:check_' + check, function(data) {
	          console.log(name, check, field, fields);
		      $.each(data.response.docs, function(i, doc)  {
		    	var checkVal = doc[field];
		        if (checkVal) {
		          values[check].push(checkVal);
		          if (checkVal < low[check] || low[check] == 0) {
		            low[check] = checkVal;
		          } else if (checkVal > high[check]) {
		            high[check] = checkVal;
		          }
		        }
		        var p = t.find('.graph_' + field);
		        if (!p.length) {
		        	t.find('.graphs').append('<span class="graph_' + field + '" style="padding: 10px"></span><span class="label_' + field + '">' + check + ':' + field.replace(/_.*$/, '') + '</span><br />');
		        	p = t.find('.graph_' + field);
		        	console.log('created', name, field, check);
	        	}
		        
		        p.sparkline(values[check], {});
		        var sum = hunits(low[check]);
		        if (low[check] != high[check]) {
		          sum = hunits(low[check]) + '&mdash;' + hunits(high[check]);
		        }
		        var detail = t.find('.label_' + checkVal).text().replace(/:.*/, '') + ': ' + sum;
		        t.find('.label_' + check).html('<a href="' + solrQuery + '?q=edge_s%3A' + name + '%20AND%20aCheck_s%3Acheck_' + check + '&sort=tickdate_dt%20desc">' + detail + '</a>');
		      });
		      }, { sort : 'tickDate_dt desc', rows: 20});
	      	}
	      }
      }, {sort: 'tickDate_dt desc', rows: 20});
  });
}
  

// human-friendly units
function hunits(v) {
  if (v > 1024*1024) {
    return (Math.ceil((v / (1024*1024)) * 10) / 10) + "M";
  } else if (v > 1024) {
    return (Math.ceil((v / (1024)) * 10) / 10) + "K";
  }
  return v;
}

function prettyDate(solrTime){
  var ret = parseISO8601(solrTime),
    dt = new Date,
    seconds = (dt.getTime() - ret.getTime()) / 1000;

  return dt + '<br />' + Math.round(seconds) + ' second' + (seconds == 1 ? '' : 's') + ' ago';
}

function parseISO8601(str) {
  str = str.replace(/\.\d+Z$/, 'Z');
 // we assume str is a UTC date ending in 'Z'

 var parts = str.split('T'),
 dateParts = parts[0].split('-'),
 timeParts = parts[1].split('Z'),
 timeSubParts = timeParts[0].split(':'),
 timeSecParts = timeSubParts[2].split('.'),
 timeHours = Number(timeSubParts[0]),
 _date = new Date;

 _date.setUTCFullYear(Number(dateParts[0]));
 _date.setUTCMonth(Number(dateParts[1])-1);
 _date.setUTCDate(Number(dateParts[2]));
 _date.setUTCHours(Number(timeHours));
 _date.setUTCMinutes(Number(timeSubParts[1]));
 _date.setUTCSeconds(Number(timeSecParts[0]));
 if (timeSecParts[1]) _date.setUTCMilliseconds(Number(timeSecParts[1]));

 // by using setUTC methods the date has already been converted to local time(?)
 return _date;
}


function findGherkins() {
  if ($('#testcase_feature_def').length) {
    doGherkins();
  }
}

function doGherkins() {
  window.feature = $('#testcase_feature_def').text();
console.log("doGherkins", window.feature);
  var id = 'id:"Test feature/' + window.feature + '/lastTick"';

  solrQuery(id, processGherkins);
}

function result(s, colour) {
    return '<span style="float: right; background: ' + colour + '; padding: 5px; clear: both">' + s + '</span>';
}

function processGherkins(data) {
  var response = data.response.docs[0];
  if (response) {
    $('#testcase_feature_def').append(result(response.tickDate_dt, 'orange'));
  }
  var indent = '&nbsp;&nbsp;';
  var props = ['Given', 'And', 'When', 'Then', 'As a', 'I want to', 'In order to'];
  var testLine = 0;
  $('.testcase_item').each(function() {
    var scenario = $(this).find('.testcase_scenario_def').text();

    $(this).find('.testcase_content').each(function() {
      var n1 = $(this).text().replace(/\n([A-Z\<])/g, '\f$1').replace(/\n/g, '');
      n1 = n1.replace(/^/g, '\n').replace(/\f/g, '\n').replace(/^\s/g, '');
      var s = n1.split("\n");
      $(this).html('');
      for (var i = 0; i < s.length; i++) {
        var n = s[i].replace(/ *$/, '');

    if (scenario && response) {
          testLine++;
          var q = window.feature + "/" + scenario + "/" + n + "/" + response.tickTime_l;
          getResult(q, testLine);
        } else {
          console.log('no scenario or response', q);
        }
        for (var j = 0; j < props.length; j++) {
          var p = props[j];
          n = n.replace(new RegExp(p, 'g'), indent + '<span style="color: orange">' + p + '</span>');
        }
        $(this).append('<p id="testLine_' + testLine + '">' + indent + n + '</p>');
        }
    });
  });
}


function getResult(id, testLine) {
    var colour = { 'passed' : 'green',
      'undefined' : 'grey',
      'failed' : 'red',
      'pending' : 'orange',
      'skipped' : 'yellow'
    };
    var displayResult = function(data) {
        var response = data.response.docs[0];
    if (!response || !response.status_s || !colour[response.status_s]) {
      console.log('unknown status', id, testLine, response, data);
    } else {
      $('#testLine_' + testLine).append(result(response.status_s + (response.error_s ? ' *' : ''), colour[response.status_s] || 'purple'));
      if (response.error_s) { 
        $('#testLine_' + testLine).append('<sup>+</sup>');
        $('#testLine_' + testLine).attr('title', response.error_s); 
      }
    }
    };

    solrQuery('id:"'+id+'"', displayResult);
}

function solrQuery(data, callback, extra) {
    if (!solrURL) {
      throw("solrURL must be defined globally.");
    }
    var p = {
      'url': solrURL,
      'data': {'wt':'json', 'q':data},
      'success': callback,
      'dataType': 'jsonp',
      'jsonp': 'json.wrf'
    }
    if (extra) {
      $.extend(p.data, extra);
    }
    $.ajax(p);
}

$(document).ready(function() { // FIXME: shouldn't run twice
console.log('running', window.devopsRunning);
  if (!window.devopsRunning) {
    window.devopsRunning = true;
    findGherkins();
    findHosts();
  }
});

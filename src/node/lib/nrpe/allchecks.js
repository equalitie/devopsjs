var defaultNumber = function() { };
var http = require('http');

exports.getChecks = function(filter) {
  var checks = [];

  checks.check_http = {
    isExec : false,
    run: function(host, callback) {
      if (!GLOBAL.CONFIG.httpCheckURI) {
        throw 'GLOBAL.CONFIG.httpCheckURI not defined';
      }
      var options = {
        host: host,
        port: 80,
        path: GLOBAL.CONFIG.httpCheckURI,
        method: 'GET'
      };

      var req = http.request(options, function(res) {
        if (res.headers.via) {
          callback('OK', null, res.headers.via);
        } else {
          callback('CRITICAL', null, res.headers);
        }
      });

      req.shouldKeepAlive = false;

      req.on('socket', function (socket) {
        socket.setTimeout(10000);  
        socket.on('timeout', function() {
          callback('CRITICAL', 'timeout', null);
          req.abort();
        });
      });
      req.on('error', function(e) {
          callback('CRITICAL', e, null);
      });

      req.end();
    }
  };
  checks.check_tcptraffic = {
    isExec : true,
    isError: function(error, stdout) { 
      if (/^TCPTRAFFIC UNKNOWN/.test(stdout)) {
        return true; 
      } else if (/^TCPTRAFFIC/.test(stdout)) {
        return false;
      }
      
      return true;
    },
    fields : { bytesPerSecond : defaultNumber, bytesIn : defaultNumber, bytesOut : defaultNumber},
    assign: function(stdout) { 
      var base = stdout.split('|');
      return {
        bytesPerSecond : base[0].split(' ')[4],
        bytesIn : base[1].split('=')[2].replace(/;.*/, ''),
        bytesOut : base[1].split('=')[3].replace(/;.*/, '') 
      };
    } 
  };
  checks.check_connections = {
    isExec : true,
    isError: function(error, stdout) { 
      if (/^CONNECTIONS/.test(stdout)) {
        return false; 
      }
      
      return true;
    },
    fields : { established : defaultNumber, waiting : defaultNumber, listeners : defaultNumber},
    assign: function(stdout) { 
      // CONNECTIONS OK - There are 11 established connections. | established=11;; waiting=0;; listeners=11;;
      var vals = stdout.split('|')[1].split('; ');
      return {
        established : vals[0].replace(/[^\d]/g, ''),
        waiting : vals[1].replace(/[^\d]/g, ''),
        listeners : vals[2].replace(/[^\d]/g, '')
      };
      } 
    };
  checks.check_fail2ban = {
    isExec : true,
    isError: function(error, stdout) { 
      if (/^fail2ban UNKNOWN/.test(stdout)) return true; 
      if (/^fail2ban/.test(stdout)) return false; 
      return true;
    },
    fields : { httpBans : defaultNumber, sshBans : defaultNumber},
    assign: function(stdout) { 
      return {
        httpBans : stdout.split('=')[1].replace(/;.*$/, ''),
        sshBans : stdout.split('=')[2].replace(/;.*$/, '')
      };
    } 
  };

  if (filter) {
    var ret = {};
    for (var i in checks) {
      if (i.match(filter)) {
        ret[i] = checks[i];
      }
    }
    return ret;
  } else {
    return checks;
  }
};

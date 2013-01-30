var http = require('http');

var store = require('./lib/solrNagios.js');

http.createServer(function (req, response) {
  response.writeHead(200, {'Content-Type': 'text/plain'});
	tab = {response: response, writeTable: writeTable};

	store.query(tab);
}).listen(7777, '199.166.207.200');

function writeTable(res) {
	response = this.response;
	response.writeHeader(200, {"Content-Type": "text/html"});  
	var rows = res.response.docs;

	var lastType;
	var close="";

	for (var key in rows) {
		var r = rows[key];

		var t = r['aCheck_s'];
		if (!(t === lastType)) {
      response.write(close+"<h2>"+t+"</h2><table>");
			var out = "<tr>";
			for (var k in r) {
				out += "<th>"+k+"</th>";
			}
			response.write(out+"</tr>\n");
			lastType = t;
			close = "</table>";
		}
			
		response.write("<tr>");
		for (var i in r) {
			response.write("<td>"+r[i]+"</td>");	
		}
		response.write("</tr>\n");
	}
	response.write("</table>");
  response.end();  
}


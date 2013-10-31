module.exports = (function(){
  var response = {
    "headers": {
      "date"          : "Wed, 23 Oct 2013 18:25:54 GMT",
      "server"        : "Apache",
      "last-modified" : "Sun, 23 Jun 2013 21:51:03 GMT",
      "etag"          : "1ba0f9e-b1-4dfd94ad8aaa3",
      "accept-ranges" : "bytes",
      "content-length": "177",
      "vary"          : "Accept-Encoding",
      "content-type"  : "text/html",
      "age"           : "0",
      "connection"    : "keep-alive",
      "via"           : "http/1.1 chicago3.deflect.ca (ApacheTrafficServer/3.2.5 [uScMsSf pSeN:t cCMi p sS])"
    },
    "body": "this is a sample body that contains a test phrase"
  };
  return {
    response: response
  };
}());

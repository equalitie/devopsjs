
var assert = require("assert");
var zombie = require("zombie");
var World = function World(callback) {


    this.browser = new zombie.Browser({debug:false});
this.visit = function(path, callback){

  this.browser.visit(path,callback);//function(e,browser,status,errors){

//	assert.equal(status, '403');
//});
  };
//    self.browser.fill("#credential_0", "csfg-tempuser").fill("credential_1","Csfgt3mporary").pressButton('Continue', callback);
callback();
};
exports.World = World;

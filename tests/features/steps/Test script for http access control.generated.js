var zombie = require('zombie');
var testingWrapper = function () {

				this.World = require("../support/zombie_world.js").World;
function handlecb(callback){
	return function(err){
	if(err == 'Error: Server returned status code 403')
		callback();
	else if(err)
		callback.fail(err);
	else
		callback();

};
}


this.Given(/^that the site is live$/, function(callback) {
 	this.visit('https://auth.fungalgenomics.ca/',handlecb(callback));
});
this.When(/^I request a try to access a protected page$/, function(callback) {
  // express the regexp above with the code you wish you had
    callback();
});

this.Then(/^I should receive a (\d+) error$/, function(arg1, callback) {
  // express the regexp above with the code you wish you had
    if(this.browser.statusCode == arg1){
    	callback();
    }else{
    	callback().fail('Incorrect Status code');
    }
});

this.When(/^I try to login with invalid credentials$/, function(callback) {
  // express the regexp above with the code you wish you had

	this.browser.fill("#credential_0", "not_real").fill("credential_1","enitrely_fake_i_hope").pressButton('Continue', handlecb(callback));

});

this.Then(/^I should receive an error message$/, function(callback) {
  // express the regexp above with the code you wish you had
    if(this.browser.statusCode == '403'){
        callback();
    }else{
        callback.fail('Expected error. Incorrect Status code: ' + this.browser.statusCode);
    }
});

this.When(/^I try to login with valid credentials$/, function(callback) {
  // express the regexp above with the code you wish you had

	this.browser.fill("#credential_0", "csfg-tempuser").fill("credential_1","Csfgt3mporary").pressButton('Continue', handlecb(callback));


});

var localWorld;
var genomeLinks;
this.Then(/^I should be directed to the table of contents$/, function(callback) {
  // express the regexp above with the code you wish you had
	if(this.browser.statusCode == '200'){
		genomeLinks = this.browser.document.querySelectorAll("td > a:first-child");		
		this.browser.visit("https://auth.fungalgenomics.ca/auth/logout.pl",callback);
		callback();
	}else{
		callback.fail("Login attempt with valid credentials failed.");
	}
});

this.Given(/^that I'm still logged in$/, function(callback) {
  // express the regexp above with the code you wish you had
//	this.visit('https://auth.fungalgenomics.ca/',callback);
	//this.browser = localWorld;
 	this.visit('https://auth.fungalgenomics.ca/');
	this.browser.fill("#credential_0", "csfg-tempuser").fill("credential_1","Csfgt3mporary").pressButton('Continue', handlecb(callback));
	/*if(localWorld == null){
	    callback();
	}else{
		callback.fail('Failed to persist world between scenarios.');
	}*/
});

this.Then(/^I should see a list of genome links$/, function(callback) {
  // express the regexp above with the code you wish you had
	//var links = this.browser.queryAll("td > a:first-child");
	if(genomeLinks.length > 0){
	    callback();
	}else{
		callback.fail('Current page does not contain genome links.');
	}
});

this.Given(/^that I'm at the table of contents of page$/, function(callback) {
  // express the regexp above with the code you wish you had
//	this.browser = localWorld;
	expectedText = '';//"GBrowse Generic Genome Browser";
	if(this.browser.text("div > h1:first-child") == expectedText){

	    callback();
	}else{
		callback.fail("Incorrect text. Expected: " + expectedText );
	}
});

this.Given(/^a list of authorized links$/, function(callback) {
  // express the regexp above with the code you wish you had
    callback();
/*
  if(this.getAuthorizedList() != ''){
    callback();
  }else{
    callback().fail();
  }*/
});
var unAuthorisedList = Array();
var authorisedList = Array();
this.When(/^I request each link on the table of contents page$/, function(callback) {
  // express the regexp above with the code you wish you had
  var baseURI = 'https://auth.fungalgenomics.ca';

this.browser.visit("http://localhost:3000", { debug: true },
  function(e, browser) {
	throw new Error('test');
    console.log("The page:", browser.html());
  }
);


/*  for(i =0; i < genomeLinks.length; i++){
	var uri = baseURI + genomeLinks[i].attributes[0].value;

	this.browser.visit(uri,function(e,browser,status,errors){

		console.log(status);
	});
//	console.dir(this.browser.history.current);
//	console.dir(this.browser.statusCode);
	this.browser.visit(baseURI + genomeLinks[i].attributes[0].value).then(function(){
		if(status == '200'){
			console.log('-------------------------200-------------');			
		}
	}).fail(function(){
		if(status == '443'){
			console.log('-------------------------443-------------');			

		}
	});
	console.log(this.browser.location);

  }*/
  callback();
});

this.Then(/^I shouldn't be able to access links not in the list$/, function(callback) {
  // express the regexp above with the code you wish you had
/*	if(){
	    callback();
	}else{
		callback.fail('Unauthroised links accessed.');
	}*/
    callback();
});

this.Then(/^I should be able to access links in the list$/, function(callback) {
  // express the regexp above with the code you wish you had
/*	if(){
	    callback();
	}else{
		callback.fail('Authorized link failed.');
	}*/

    callback();
});
}

module.exports = testingWrapper;


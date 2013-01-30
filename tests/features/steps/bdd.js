var testingWrapper = function () {

				this.World = require("../support/world.js").World;

				Given(/^there is a local configuration file$/, function(callback) {
					try {
	          this.getConfigFile();
					} catch(e) {
            callback.fail(e);
					}
					callback();
				});

				When(/^I have access to a test database$/, function(callback) {
					var conf = this.getConfigFile();
					var http;
					if (conf.protocol === 'http') {
						http = require('http');
					} else {
						http = require('https');
					}
					http.get({host : conf.host}, function(res) {
						if (res.statusCode == 200) {
							callback();
						}
					}).on('error', function(e) {
						callback.fail("Got error: " + e.message);
					});
				});

				Then(/^I should be able to login to that system$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				Given(/^there is a list of test items$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				When(/^I request a list of test items as json$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				Then(/^I should receive a list of test items as json$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				Given(/^a test item as json$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				When(/^I examine that provider as json$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});

				Then(/^it should have test details$/, function(callback) {
					// express the regexp above with the code you wish you had
					callback.pending();
				});
}

module.exports = testingWrapper;


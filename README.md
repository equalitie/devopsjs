devopsjs
========

Support comprehensive configuration, resource usage, monitoring and development using high level components.

This is the documentatin for setup. Further documentation is at https://wiki.deflect.ca/wiki/Devopsjs . If you'd like to set this system up please contact us so we can make the documenation better.

Components of devopsjs:

* NRPE for system tests
* node.js for scripting components and command line interaction
* Semantic Mediawiki for configuration
* node-logstash for systems data processing
* ElasticsEarch for data storage
* Kibana for visualization
* BDD to define and test systems (in development)

# Install

First, set up ElasticSearch. Configuration for a typical Debian server is in the host/ directory. Use the put_mapping script to push the schema.

You will need some additional system libraries, on a Debian distro this may include libgeoip-dev, libpcre3-dev, zlib1g-dev. Also, install MaxMind's GeoLiteCity.dat to /usr/local/geoip. Then:

    cd devopsjs 
    npm install

Edit config/localConfig.js based on this:

```javascript
var c = {};

/* configure DNets */

c.dnets = ['dnet1.deflect.ca', 'dnet2.deflect.ca'];
c.domain = '.deflect.ca';
c.defaultDNET = 'default';

c.httpCheckURI = 'http://somedefaultURLonhosts';

/* configuration for notifier */
c.notify = {emailSubject : 'devopsjs notifications',
  emailFrom : 'someone@somewhere'
}

var nodemailer = require("nodemailer");
var transport = nodemailer.createTransport("Sendmail", "/usr/sbin/sendmail");

transport.sendNotification = function(msg, callback) {
  this.sendMail(msg, callback);
}

c.notify.notifyTransport = transport;

/* configuration for wiki */

c.wikiConfig = {
  server: 'your.configwiki',
  protocol: 'https',
  path: '/mediawiki',
  username: 'Wiki bot',
  password: 'wiki password',
  debug: false
}

/* configuration for elasticsearch */
c.elasticSearchConfig = {
  _index : 'devopsjs',
  server : {
      host : 'your.elasticsearchinstance',
      port : 9200
  }
}

GLOBAL.CONFIG = c;

```

DNets can be added to the config directory as dnetname.js, eg, 

```javascript
var c = GLOBAL.CONFIG;
c.flatHostsFile = '/usr/local/deflect/etc/edges/edges.dnet1.live';
c.allFlatHostsFile = '/usr/local/deflect/etc/edges/edges.dnet1';
c.minActive = 6;
c.subdomain = 'deflect.ca';

c.rotationTimeMinutes = 60;
GLOBAL.CONFIG = c;
```

# Operations

1. Set up the general Deflect system - https://wiki.deflect.ca/wiki/Deflect_DIY
1. Configure src/node/nrpeCheck.js to run frequently
1. Configure src/node/edgemanage.js -r to auto-rotate as required
1. Configure src/node/watchnotify.js to run regularly
1. Use edgemanage on its own for edge management operations

# Style Guide
[idi] https://github.com/equalitie/idiomatic.js 'idiomatic.js'

# General development workflow

development follows two tracks:

1. unit testing the tests
grunt watch:devUnit  
This will run unit tests against the test helper classes

2. running the bdd tests  
```
src/node/yadda-tests/lib/bdd-test-runner.js 
```
Following Flags available:  
  1. -S or --site [sitename] site to run the tests against
  2. -f write the results to a file src/node/yadda-tests/results.js
  3. -O or --outfile [filename] write results in json format to specefied [filename]

Default runner is the spec runner which should provide helpful error messages where failures occur

3. Sanity Tests
To run the unit and config tests 
```
grunt sanity-test
```


## Documentation
Annotated Source will be generated by grunt in a folder called docs/annotated-source
config in Gruntfile.js

## Linting
Code is linted using jslint, following the style guide set out above should keep you within those restrictions

## Code Quality
plato is used to create a report on code quality metrics, this will again be triggered with grunt. Results will be available in reports folder



Under development itself.

1. Initial wiki definition
  1. Refine with stakeholders
1. Create BDD feature and scenarios on wiki
  1. Refine with stakeholders
1. Generate cucumber stubs from test cases <ref name="cukedef">server nodejs code downloads features & scenarios based on query, generates stubs</ref>
  1. Tests 'pending' <ref name="runtests">on wiki change or manual trigger, server nodejs runs tests and posts to solr, client js queries solr and displays results</ref>
1. Implement test cases on server<ref name="cukedef" />
  1. Tests 'fail' <ref name="runtests" />
1. Implement code on server<ref name="cukedef" />
  1. Tests 'pass' <ref name="runtests" />
1. Validate with stakeholders
  1. Function and interface testing
1. Refine definitions
1. Operationalize
  1. add ''Every'' keyword to scenarios <ref name="every">per ''Every'' definition, server nodejs runs tests and posts to solr</ref>
  1. can view current and historical test results

# Credits

Developed for the Equalit.ie Deflect project and Concordia CSFG.


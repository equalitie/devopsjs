devopsjs
========

Support comprehensive configuration, resource usage, monitoring and development using high level components.


# Install

    cd devopsjs 
    npm install

edit config/localConfig.js based on this:

```javascript
var c = {};

/* configure DNets */

c.dnets = ['dnet1.deflect.ca', 'dnet2.deflect.ca'];
c.domain = '.deflect.ca';

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

DNets can be added to the config directory, eg, 

```javascript
var c = GLOBAL.CONFIG;
c.flatHostsFile = '/usr/local/deflect/etc/edges/edges.dnet1.live';
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


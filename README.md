devopsjs
========

Work in progress project to support development and operations around a semantic wiki, BDD, NRPE. Emphasizing minimum invention, data reuse, comprehensibility, ability to 'drill-down.' Advice and contributions welcome.

# Install

    sudo npm install -g cucumber
    cd devopsjs 
    npm install

edit config/localConfig.js based on this:


```javascript
var c = {};

c.flatHostsFile = 'name of hosts flat file';
c.solrConfig = { host: 'yourhost', core: 'yourcore'};
GLOBAL.CONFIG = c;
```


# General workflow

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


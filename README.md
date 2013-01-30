devopsjs
========

Work in progress project to support development and operations around a semantic wiki, BDD, NRPE. Emphasizing minimum invention, data reuse, comprehensibility, ability to 'drill-down.' Advice and contributions welcome.

# Install

sudo npm install cucumber
cd devopsjs 
npm install

more to come.

# General workflow

1. Initial wiki definition
1.1 Refine with stakeholders
2. Create BDD feature and scenarios on wiki
2.1 Refine with stakeholders
3. Generate cucumber stubs from test cases <ref name="cukedef">server nodejs code downloads features & scenarios based on query, generates stubs</ref>
3.1 Tests 'pending' <ref name="runtests">on wiki change or manual trigger, server nodejs runs tests and posts to solr, client js queries solr and displays results</ref>
4. Implement test cases on server<ref name="cukedef" />
4.1 Tests 'fail' <ref name="runtests" />
5. Implement code on server<ref name="cukedef" />
5.1. Tests 'pass' <ref name="runtests" />
6. Validate with stakeholders
6.1. Function and interface testing
7. Refine definitions
8. Operationalize
8.1. add ''Every'' keyword to scenarios <ref name="every">per ''Every'' definition, server nodejs runs tests and posts to solr</ref>
8.2. can view current and historical test results

# Credits

Developed for the Equalit.ie Deflect project and Concordia CSFG.


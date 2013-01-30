devopsjs
========

Work in progress project to support development and operations around a semantic wiki, BDD, NRPE. Emphasizing minimum invention, data reuse, comprehensibility, ability to 'drill-down.' Advice and contributions welcome.

== Install ==

sudo npm install cucumber
cd devopsjs 
npm install

more to come.

== General workflow ==

# Initial wiki definition
## Refine with stakeholders
# Create BDD feature and scenarios on wiki
## Refine with stakeholders
# Generate cucumber stubs from test cases <ref name="cukedef">server nodejs code downloads features & scenarios based on query, generates stubs</ref>
## Tests 'pending' <ref name="runtests">on wiki change or manual trigger, server nodejs runs tests and posts to solr, client js queries solr and displays results</ref>
# Implement test cases on server<ref name="cukedef" />
## Tests 'fail' <ref name="runtests" />
# Implement code on server<ref name="cukedef" />
## Tests 'pass' <ref name="runtests" />
# Validate with stakeholders
## Function and interface testing
# Refine definitions
# Operationalize
## add ''Every'' keyword to scenarios <ref name="every">per ''Every'' definition, server nodejs runs tests and posts to solr</ref>
## can view current and historical test results

== Credits ==

Developed for the Equalit.ie Deflect project and Concordia CSFG.


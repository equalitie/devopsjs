#!/bin/bash

node src/node/gettests.js configs/wikiConfig.json
for i in tests/features/*.generated.feature; do 
				cucumber.js "$i" -f json > work/output.json
				cat work/output.json | node src/node/cukeToSolr.js
done


REPORTER = dot

test:
	./node_modules/.bin/mocha -u tdd --reporter list

test-w:
	./node_modules/.bin/mocha -w -u tdd --reporter list

.PHONY: test test-w

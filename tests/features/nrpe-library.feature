Feature: Support a library of NRPE routines

Scenario: Obtain a filtered NRPE check
	Given a function to get filtered checks
  When calling the function with the parameter 'fail2ban'
  Then it should return one check


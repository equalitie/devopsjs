Scenario: should perform dns lookup
  Given cromac.net looked up
  Then the address should resolve

Scenario: should make a request via a proxy
  Given secure.wikifier.org looked up
  When used as a proxy to make a request to www.google.com
  Then it should receive a 200 response

Scenario: should make a request via localhost
  Given localhost looked up
  When used as a proxy to make a request to www.google.com
  Then it should receive a 200 response


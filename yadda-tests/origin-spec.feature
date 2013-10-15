Feature: Test secure.wikifier.org
  Scenario: should perform dns lookup
    Given secure.wikifier.org looked up
    Then the address should resolve
    And it should return within 20 seconds
    And it should include the word presentation    

  Scenario: should make a request via a proxy
    Given staging.deflect.ca looked up
    When used as a proxy to make a request to secure.wikifier.org
    Then it should receive a 200 response

  Scenario: should make a request via localhost
    Given localhost looked up
    When used as a proxy to make a request to www.google.com
    Then it should receive a 200 response

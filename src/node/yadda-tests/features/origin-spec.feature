Feature: Test secure.wikifier.org

  Scenario: should perform dns lookup
    Given equalit.ie looked up
    Then the address should resolve
    Then it should return within 20 seconds
    Then the addresses should be deflect

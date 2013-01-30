Feature: A testing system influenced by BDD
  As a participant in development and operations
  In order to sensibly take part in development and operations 
  I want to be able to define and test aggregate systems

Scenario: Establish connection to test database
  Given there is a local configuration file 
  When I have access to a test database
  Then I should be able to login to that system

Scenario: Get list of test items
  Given there is a list of test items
  When I request a list of test items as json 
  Then I should receive a list of test items as json

Scenario: Get details of test item
  Given a test item as json
  When I examine that provider as json 
  Then it should have test details

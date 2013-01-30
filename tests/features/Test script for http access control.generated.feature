Feature: Browser based authentication
  As a user of the auth system
  In order to ensure only appropriate permissions are available
  I want to be able to test valid and invalid access


Scenario: Cannot directly access a protected page
  Given that the site is live
  When I request a try to access a protected page
  Then I should receive a 403 error


Scenario: Cannot access with invalid login
  Given that the site is live
  When I try to login with invalid credentials
  Then I should receive an error message


Scenario: Can access with valid login
  Given that the site is live
  When I try to login with valid credentials
  Then I should be directed to the table of contents


Scenario: At the table of contents page
  Given that I'm still logged in
  Then I should see a list of genome links


Scenario: Cannot access unauthorized link
  Given that I'm at the table of contents of page
  And a list of authorized links
  When I request each link on the table of contents page
  Then I shouldn't be able to access links not in the list


Scenario: Can access authorized link
  Given that I'm at the table of contents of page
  And a list of authorized links
  When I request each link on the table of contents page
  Then I should be able to access links in the list


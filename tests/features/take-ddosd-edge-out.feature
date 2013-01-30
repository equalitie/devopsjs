Feature: Take DDOS'd node out of rotaion
In order to optimize bandwidth and analyze attacks
As an edge controller
I want to remove an edge when it's under DDOS


Scenario: Edge is under DDOS
	Given edge input readings
  And readings in a window above a maximum
  When the edge controller is run
  Then it should remove the edge from rotation


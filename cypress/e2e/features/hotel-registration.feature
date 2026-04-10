Feature: Hotel registration and confirmation flow
  As a Hotel Owner
  I want to register a hotel and confirm a matching profile
  So that the certification process can continue

  Background:
    Given I am authenticated as a hotel owner

  Scenario: Successful two-step registration flow
    Given I have a valid unique hotel payload
    When I submit the hotel registration request
    Then the registration response should be successful
    And I should receive a hotel id and candidate list
    When I confirm the hotel match using the first candidate or null
    Then the confirmation response should be successful
    And the evaluation status should be one of pending passed failed

  Scenario: Duplicate registration is rejected
    Given I have a valid unique hotel payload
    When I submit the hotel registration request
    And I submit the same hotel registration payload again
    Then the duplicate response status should be 409

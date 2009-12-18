Feature: view pages
    Scenario: Home page
        Given I am viewing "/"
        Then I should see the homepage

    Scenario: Click on "Create a Stack"
        Given I am viewing "/"
        When I click on "Create a Stack"
        Then I should see the Create a Stack page

Given /^I am viewing "(.+)"$/ do |url|
    visit(url)
end


When /^I click on "Create a Stack"$/ do
    click_link 'homeCreateLink'
end

Then /^I should see the homepage/ do
    response_body.should have_selector('h1', :class=>"lead")
end

Then /^I should see the Create a Stack page$/ do
    response_body.should have_selector("h2", :class=>"unedited")
end

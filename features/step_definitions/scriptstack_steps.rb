Given /^I am viewing "(.+)"$/ do |url|
    visit(url)
end

Then /^I should see the homepage/ do
    response_body.should =~ /(.+)/
end

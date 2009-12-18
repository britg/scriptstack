#require File.expand_path(File.dirname(__FILE__)+'/../../spec_helper')

require File.expand_path(File.dirname(__FILE__)+'/../../app')
require 'haml'
require 'webrat'
require 'rack/test'

Webrat.configure do |config|
    config.mode = :rack
    config.application_framework = :sinatra
    config.application_port = 3000
end

Sinatra::Application.set :environment, :development

World do
    def app
        @app = Rack::Builder.new do
            run Sinatra::Application
        end
    end
    include Rack::Test::Methods
    include Webrat::Methods
    include Webrat::Matchers
end

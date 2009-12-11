require 'rubygems'
require 'compass'
require 'sinatra'
require 'haml'

require 'models/mongo'
require 'models/user'
require 'models/stack'

require 'digest/sha1'

set :app_file, __FILE__
set :root, File.dirname(__FILE__)
set :views, "views"
set :public, 'static'

#configure do
  #Compass.configuration.parse(File.join(Sinatra::Application.root, 'config', 'compass.config'))
#end

get '/css/:name.css' do
  content_type 'text/css', :charset => 'utf-8'
  sass(:"css/#{params[:name]}", Compass.sass_engine_options )
end

get '/' do
    @stacks = Stack.find(:all)
    haml :index
end

get '/create' do
    @stack = Stack.new
    haml :editor
end

post '/create' do 
    stack = Stack.new(params[:stack])
    stack.save()

    content_type 'application/json', :charset => 'utf-8'
    stack.to_json
end

get '/stacks/:id' do 
    @stack = Stack.find(params[:id])
    haml :editor
end

post '/stacks/:id' do
    stack = Stack.update(params[:id] => params[:stack])
    
    content_type 'application/json', :charset => 'utf-8'
    stack[0].to_json
end


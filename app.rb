require 'rubygems'
require 'compass'
require 'sinatra'
require 'haml'
require 'yui/compressor'

require 'models/mongo'
require 'models/user'
require 'models/stack'
require 'models/script'

require 'digest/sha1'
require 'reloader'

set :app_file, __FILE__
set :root, File.dirname(__FILE__)
set :views, "views"
set :public, 'static'

get '/css/:name.css' do
  content_type 'text/css', :charset => 'utf-8'
  sass(:"css/#{params[:name]}", Compass.sass_engine_options )
end

get '/' do
    @stacks = Stack.find(:all, :fields => [:title])
    haml :index
end

get '/create' do
    @stack = Stack.new
    @scripts = []
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
    puts 'Stack: ' + @stack.inspect
    @scripts = Script.find(:all, :id => @stack.scripts, :fields => "name, original_size, minified_size, tags")
    puts @scripts.to_json
    haml :editor
end

post '/stacks/delete' do 
    puts ">> Stack ID:" + params[:stack][:id]
    stack = Stack.find(params[:stack][:id])
    stack.destroy
    content_type 'application/json', :charset => 'utf-8'
    '{"result":"success"}'
end

post '/stacks/:id' do
    params[:stack][:title] = params[:stack][:title].gsub(/<\/?[^>]*>/, '')
    stack = Stack.update(params[:id] => params[:stack])
    
    content_type 'application/json', :charset => 'utf-8'
    stack[0].to_json
end

post '/scripts/upload' do
    if params[:stack_id]
        stack = Stack.find(params[:stack_id])
    else
        stack = Stack.new
    end
    
    unless params[:userfile] && 
        (tmpfile = params[:userfile][:tempfile]) &&
        (name = params[:userfile][:filename])
        return '{"error":"No file selected"}'
    end

    content = tmpfile.read

    # Minify and get size
    compressor = YUI::JavaScriptCompressor.new
    compressed = compressor.compress(content)

    script = Script.new({
        :name => name,
        :content => content,
        :original_size => tmpfile.size,
        :minified_size => compressed.length,
        :stack_id => stack.id
    })
    script.save

    # Remove script content for json serialization and add
    # the rendered partial
    script.content = haml :_script, :layout => false, :locals => {:script => script}

    stack.scripts << script.id
    stack.save

    content_type 'text/plain', :charset => 'utf-8'
    "{stack:" + stack.to_json + ", script:" + script.to_json + "}"
end

get '/scripts/:id' do
    script = Script.find(params[:id])
    content_type 'application/json', :charset => 'utf-8'
    script.to_json
end

post '/scripts/tags' do
    script_id = params[:script][:id]
    tagstr = params[:script][:tags]

    script = Script.find(script_id)
    script.tags = tagstr.split(',').map do |tag|
        tag.strip.gsub(/<\/?[^>]*>/, '')
    end

    script.save
    content_type 'application/json', :charset => 'utf-8'
    script.to_json
end

post '/scripts/name' do
    script_id = params[:script][:id]
    name = params[:script][:name]

    script = Script.find(script_id)
    script.name = name.strip.gsub(/<\/?[^>]*>/, '')
    script.save
    content_type 'application/json', :charset => 'utf-8'
    script.to_json
end

post '/scripts/delete' do
    script = Script.find(params[:script][:id])

    # remove the script from the list of scripts in the stack
    stack = Stack.find(script.stack_id)
    stack.scripts.delete_if do |item|
        item == script.id
    end

    stack.save
    script.destroy

    content_type 'application/json', :charset => 'utf-8'
    '{"result":"success"}'
end

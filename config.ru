#\ -E development
require 'app'
use Sinatra::Reloader, 0
run Sinatra::Application

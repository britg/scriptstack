require 'mongo_mapper'

class Stack
    include MongoMapper::Document

    key :title, String
    key :description, String
    key :published, Boolean
    key :scripts, Array
    key :original_size, Integer, :default => 0
    key :minified_size, Integer, :default => 0

end

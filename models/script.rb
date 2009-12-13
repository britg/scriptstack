require 'mongo_mapper'

class Script 
    include MongoMapper::Document

    key :name, String
    key :original_size, Integer
    key :minified_size, Integer
    key :content, String
    key :tags, Array
    key :stack_id, String

end

require 'mongo_mapper'

class Script 
    include MongoMapper::EmbeddedDocument

    key :name, String
    key :original_size, Integer
    key :minified_size, Integer
    key :content, String

end

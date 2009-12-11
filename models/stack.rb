require 'mongo_mapper'

class Stack
    include MongoMapper::Document

    key :title, String
    key :description, String
    key :published, Boolean

end

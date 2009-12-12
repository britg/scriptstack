require 'mongo_mapper'

class ScriptContent
    include MongoMapper::Document

    key :script_id, String
    key :content, Boolean
end

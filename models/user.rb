require 'mongo_mapper'

class User
    include MongoMapper::Document

    key :username, String, 
        :required => true, 
        :unique => true,
        :length => 3..15
    key :email, String, :required => true, :unique => true
    key :password, String, :required => true, :length => 3..100

end

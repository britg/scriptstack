require 'mongo_mapper'
logger = Logger.new($stdout)
MongoMapper.connection = Mongo::Connection.new('db.mongohq.com', 27017, :auto_reconnect => true, :logger => logger)
MongoMapper.database = 'dashpp'
MongoMapper.database.authenticate('britg', '193170bs')


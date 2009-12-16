require 'mongo_mapper'
logger = Logger.new($stdout)
#MongoMapper.connection = Mongo::Connection.new('db.mongohq.com', 27017, :auto_reconnect => true, :logger => logger)
#MongoMapper.database = 'dashpp'
#MongoMapper.database.authenticate('britg', '193170bs')
MongoMapper.connection = Mongo::Connection.new('localhost', 27017, :logger => logger)
MongoMapper.database = 'scriptstack'
#MongoMapper.database.authenticate('britg', '193170bs')


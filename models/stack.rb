require 'mongo_mapper'
require 'mongo/gridfs'
require 'models/script'
require 'models/mongo_fast_gridfs'
require 'yui/compressor'

class Stack
    include MongoMapper::Document

    key :title, String
    key :description, String
    key :published, Boolean
    key :scripts, Array
    key :original_size, Integer, :default => 0
    key :minified_size, Integer, :default => 0
    key :last_build_time, Time, :default => Time.now

    before_save :update_last_build_time

    def update_last_build_time 
        self.last_build_time = Time.now
    end

    def is_current?(filename)
        if GridFS::GridStore.exist?(MongoMapper.database, filename)
            build_date = nil
            metadata = nil
            contents = nil

            GridFS::GridStore.open(MongoMapper.database, filename, 'r') {|f|
                build_date = f.upload_date
                contents = f.fast_read
                metadata = f.metadata
            }

            if metadata != nil && metadata > self.last_build_time
                return contents
            end
        end
        return false
    end


    def raw
        filename = self.id.to_s + '.js'

        if output = is_current?(filename)
            return output
        end

        output = ""
        self.scripts.each do |script_id|
            script = Script.find(script_id, :fields => "content")
            output << script.content
        end

        GridFS::GridStore.open(MongoMapper.database, filename, 'w') {|f|
            f.fast_write(output)
            f.metadata = Time.now
        }

        output
    end

    def minified
        filename = self.id.to_s + 'min.js'
        if output = is_current?(filename)
            return output
        end

        uncompressed = raw
        compressor = YUI::JavaScriptCompressor.new
        compressed = compressor.compress(uncompressed)

        GridFS::GridStore.open(MongoMapper.database, filename, 'w') {|f|
            f.fast_write(compressed)
            f.metadata = Time.now
        }

        compressed
    end
end

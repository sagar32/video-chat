var mongoClient = require('mongodb').MongoClient;
var _db;
//var URL = 'mongodb://192.168.2.22:27017/videoChatDB';
var URL = 'mongodb://techhive:techhive@ds145405.mlab.com:45405/techhive';
module.exports = {
    connectToServer: function (callback) {
        mongoClient.connect(URL, function (err, db) {
            _db = db;
        return callback(err);
        });
    },
    getDB: function () {
        return _db;
    }
}
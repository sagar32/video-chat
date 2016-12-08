var myMongoCon = require('../myMongoCon');
var async = require("async");
var ObjectId = require('mongodb').ObjectID;

module.exports = {
    userRegister: function (newUser, callback) {
        var db = myMongoCon.getDB();
        var collection = db.collection('allUsers');
        var newUsername=newUser.username.split(" ").map(function(i){return i[0].toUpperCase() + i.substring(1)}).join(" ");
        console.log(newUsername);
        collection.find({$or: [{email: newUser.email}, {username: newUsername}]}).toArray(function (err, find) {
            if (find.length > 0) {
                callback(false);
            } else {
                collection.insert({email: newUser.email, username: newUsername, password: newUser.password, connectedUser: []}, function (err, success) {
                    global.gUserId=success['insertedIds'][0];
                    console.log(success['insertedIds'][0]);
                    if (success.insertedCount == "1") {
                        callback(success.ops[0]);
                    } else {
                        callback(false);
                    }
                });
            }
        });
    },
    loginUser: function (loginCredential, callback) {
        var db = myMongoCon.getDB();
        var collection = db.collection('allUsers');
        var newUsername=loginCredential.userName.split(" ").map(function(i){return i[0].toUpperCase() + i.substring(1)}).join(" ");
        collection.find({$and: [{'username': newUsername}, {'password': loginCredential.userPassword}]}, {'username': 1, 'email': 1,connectedUser:1,profileImg:1}).toArray(function (err, result) {
            if (err)
                callback(false);

            if (result.length == "1") {
                callback(result[0]);
            } else {
                callback(false);
            }
        });
    },
    getUserList: function (callback) {
        var db = myMongoCon.getDB();
        var collection = db.collection('allUsers');
        collection.find({}, {username: 1, email: 1,profileImg:1}).toArray(function (err, result) {
            if (err)
                callback(false);

            if (result.length > 0) {
                callback(result);
            } else {
                callback(false);
            }
        });
    },
    connectUserRoom: function (meWith, callback) {
        var db = myMongoCon.getDB();
        var userRoom = db.collection('allUsers');
        userRoom.find({_id:new ObjectId(meWith.me._id)}).toArray(function (err, result) {
            var returnRoomId = "";
            if (err)
                callback(false);
            if (result.length > 0) {
                var flag = false;
                async.series([
                    function (callback) {
                        for (var i = 0; i < result[0].connectedUser.length; i++) {
                            if (result[0].connectedUser[i].userId == meWith.with._id) {
                                flag = true;
                                returnRoomId = result[0].connectedUser[i].roomId;
                            }
                        }
                        callback();
                    }
                ], function (err) {
                    if (flag) {
                        callback(returnRoomId);
                    } else { 
                        var roomId = Math.random().toString(36).substring(7);
                        console.log(roomId);
                        userRoom.update({_id: new ObjectId(meWith.me._id)}, {$push: {connectedUser: {userId: meWith.with._id, roomId: roomId}}});
                        userRoom.update({_id: new ObjectId(meWith.with._id)}, {$push: {connectedUser: {userId: meWith.me._id, roomId: roomId}}});
                        callback(roomId);

                    }
                });
            }
        });

    },
    getConnectedUsers: function (id, callback) {
        var db = myMongoCon.getDB();
        var userRoom = db.collection('UserRoom');
        userRoom.find({id: id}).toArray(function (err, result) {
            callback(result[0]);
        });
    },
    setProfileImage:function(imgData){
         var db = myMongoCon.getDB();
        var userRoom = db.collection('allUsers');
        userRoom.update({_id:new ObjectId(imgData.userId)},{$set:{profileImg:imgData.img}});
        console.log("update");
    }
};


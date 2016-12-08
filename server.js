var http = require("http");
var url = require("url");
var fs = require("fs");
var util = require("util");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");

var port = process.env.PORT || 4000;
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html");
});
var webServer = app.listen(port);
console.log("Web Server is listening in port " + port);

///////////////////
//Import Modules
var usersModule = require('./modules/userModule');
var messageStorage = require('./modules/messageStorage');

//////////////////////
// MongoDb Connection
var myMongoCon = require('./myMongoCon');
myMongoCon.connectToServer(function (err) {
    if (err) {
        console.log("Connection failed");
    }
});

/////////////////
// routes here
app.post('/registerUser', function (req, res) {
    //console.log(req.body);
    usersModule.userRegister(req.body, function (response) {
        if (response) {
            //getRegUsers();
            res.send(response);
        } else {
            res.send(false);
        }
    });
});
app.post('/loginUser', function (req, res) {
    usersModule.loginUser(req.body, function (response) {
        if (response) {
            //getRegUsers();
            console.log(response);
            res.send(response);
        } else {
            res.send(false);
        }
    });
});

app.get('/allUserRightSideList', function (req, res) {
    usersModule.getUserList(function (allUsers) {
        if (allUsers)
            res.send(allUsers);
    });
});

app.post('/connectUserRoom', function (req, res) {
    console.log(req.body);
    usersModule.connectUserRoom(req.body, function (responce) {
        if (responce) {
            res.send(responce);
        } else {
            res.send(false);
        }
    });
});

// WebSockets Server

var rooms = {};

var io = require("socket.io")(webServer);

io.sockets.on('connection', function (socket) {

    var address = socket.handshake.address;
    // console.log((new Date()) + ' Peer connected: ' + address);
    allRoomMsg(socket);
    socket.on('login', function (user, room) {

        // Check illegal character '#'
        if ((user.indexOf('#') >= 0) || (room.indexOf('#') >= 0)) {
            // console.log('User or room error: illegal character \'#\'.');
            socket.disconnect();
            return;
        }

        if (rooms[room] === undefined) {
            rooms[room] = {'userlist': {}, 'mod': [user], 'ban': [], 'mute': []};
            socket.emit('admin', user, 'mod');
        } else if (rooms[room].userlist[user] !== undefined) {
            // console.log('User already exists in the room.')
            socket.disconnect();
            return;
        } else if (rooms[room].ban.indexOf(address) >= 0) {
            // console.log(address + ' banned in room ' + room + '.');
            socket.disconnect();
            return;
        }

        socket.room = room;
        socket.user = user;

        socket.emit('userlist', Object.keys(rooms[room].userlist));
        bcast(socket, 'hello', '');
        rooms[room].userlist[user] = socket;

        socket.on('message', function (data) {
            bcast(this, 'message', data);
        });

        // WebRTC functions
        socket.on('offer', function (to, data) {
            send(this, 'offer', to, data);
        });

        socket.on('answer', function (to, data) {
            send(this, 'answer', to, data);
        });

        socket.on('ice', function (to, data) {
            send(this, 'ice', to, data);
        });

        // WebRTC stream routing request
        // socket.on('route', function(to,data) {
        // send(this, 'route', to, data);
        // });

        // Moderation
        socket.on('admin', function (to, data) {

            var room = socket.room;
            var from = socket.user;

            if (rooms[room].userlist[to] === undefined)
                return;

            var mod = rooms[room].mod.indexOf(from) >= 0;
            var muted = rooms[room].mute.indexOf(to) >= 0;
            var address = rooms[room].userlist[to].handshake.address;
            var banned = rooms[room].ban.indexOf(address) >= 0;

            switch (data) {
                case 'mod':
                    if (mod && (rooms[room].mod.indexOf(to) < 0)) {
                        rooms[room].mod.push(to);
                        bcast_admin(socket, to, 'mod');
                    }
                    break;
                case 'ban':
                    if (mod && !banned) {
                        rooms[room].ban.push(address);
                    }
                case 'kick':
                    if (mod) {
                        rooms[room].userlist[to].emit('admin', to, 'kicked');
                        rooms[room].userlist[to].disconnect();
                    }
                    break;
                case 'unban':
                    if (mod && banned) {
                        rooms[room].ban.splice(rooms[room].ban.indexOf(address), 1);
                    }
                    break;
                case 'mute':
                    if (mod && !muted) {
                        rooms[room].mute.push(to);
                        bcast_admin(socket, to, 'mute');
                    }
                    break;
                case 'unmute':
                    if (mod && muted) {
                        rooms[room].mute.splice(rooms[room].mute.indexOf(to), 1);
                        bcast_admin(socket, to, 'unmute');
                    }
                    break;
            }
        });

        socket.on('disconnect', function () {

            var room = socket.room;
            var user = socket.user;
            bcast(socket, 'bye', '');
            delete rooms[room].userlist[user];
            if (Object.keys(rooms[room].userlist).length == 0) {
                delete rooms[room];
            } else {
                var mod = rooms[room].mod.indexOf(user);
                if (mod > -1)
                    rooms[room].mod.splice(mod);

                var muted = rooms[room].mute.indexOf(user);
                if (mod > -1)
                    rooms[room].mute.splice(muted);
            }
        });
    });
});

// Broadcast a message
function bcast(socket, tipo, msg) {
    var room = socket.room;
    var from = socket.user;
    for (var to in rooms[room].userlist) {
        rooms[room].userlist[to].emit(tipo, from, msg);
    }
}
;

// Send a message
function send(socket, tipo, to, msg) {
    var room = socket.room;
    var from = socket.user;
    if (rooms[room].userlist[to] !== undefined)
        rooms[room].userlist[to].emit(tipo, from, msg);
}
;

// Admin broadcasts
function bcast_admin(socket, to, command) {
    var room = socket.room;
    var from = socket.user;
    for (var user in rooms[room].userlist) {
        rooms[room].userlist[user].emit('admin', to, command);
    }
}
;
//retirn all room messages
function allRoomMsg(socket) {
    messageStorage.getMessage(function (responce) {
        if (responce) {
            socket.emit("allRoomMsg", responce);
        }
    });
}
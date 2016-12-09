"use strict"

///////
// TechHive

var techhive = angular.module('TechHive', ['ui.router', 'yaru22.angular-timeago']);

///////////
// Config

techhive.config(function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        "http**",
        "blob**"
    ]);
});

//////////
// Debug
const debug = {
    interface: false,
    room: false,
    call: false,
    ice: false,
    channel: false,
    stats: false,
    error: true
};

function log(type, msg) {
    if (debug[type])
        console.log(msg);
}

////////////////
//App run

techhive.run(['$rootScope', '$window', '$state', '$stateParams', function ($rootScope, $window, $state, $stateParams) {
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.loginCheck = function () {
            //check user is login or not
            if ($window.localStorage.getItem("isLoginUser")) {
                //console.log('is login');
                $window.location = "#/home";
//            $state.go('home');
                //console.log($window.localStorage.getItem("isLoginUser"));
            } else {
                // console.log('is NOT login');
                $window.location = "#/login";
            }
        }
        $rootScope.loginCheck();
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
            if (toState.url == "/login" || toState.url == "/home") {
                $rootScope.loginCheck();
            }
//            console.log(toState.url);
//            console.log(toParams);

        });
        //////////
        // return true if value is empty
        $rootScope.isEmpty = function (value) {
            if (value === "" || value === null || typeof value === "undefined") {
                return true;
            } else {
                return false;
            }
        };

        //////////
        // return true if value is NotEmpty
        $rootScope.isNotEmpty = function (value) {
            if (value === "" || value === null || typeof value === "undefined") {
                return false;
            } else {
                return true;
            }
        };
    }]);

////////////////
// app router

techhive.config(function ($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/login');

    $stateProvider
            // LOGIN STATES ========================================
            .state('login', {
                url: '/login',
                templateUrl: 'app/login/login.html',
                controller: 'login'
            })
            // REGISTRATION STATES ========================================
            .state('registration', {
                url: '/registration',
                templateUrl: 'app/registration/registration.html',
                controller: 'registration'
            })
            // VIDEOCALL STATES ========================================        
            .state('home', {
                url: '/home',
                views: {
                    '': {templateUrl: 'app/home/home.html', controller: 'home'},
                    'header@home': {templateUrl: 'app/header/header.html'},
                    'userPanel@home': {templateUrl: 'app/userPanel/user-panel.html'},
                    'messages@home': {templateUrl: 'app/messages/messages.html'},
                    'remoteVideo@home': {templateUrl: 'app/remoteVideo/remote-video.html'}
                }


            });

});

/////////////////////
// login controller
techhive.controller('login', ['$scope', '$http', '$window', '$state', function ($scope, $http, $window, $state) {
        //init
        $scope.login = {};

        //login users
        $scope.loginUser = function () {

            if ($scope.isNotEmpty($scope.login.userName) && $scope.isNotEmpty($scope.login.userPassword)) {
                console.log($scope.login);

                $http.post('/loginUser', $scope.login).success(function (data) {
                    if (data) {
                        console.log(data);
                        $window.localStorage.setItem("isLoginUser", JSON.stringify(data));
                        //console.log();
                        //$scope.onLoginSuccess();
                        $state.go('home');
                    } else {
                        $scope.isError1 = 'You are not registred user, Please Sign up with us.';
                    }
                });
            } else {
                $scope.isError1 = 'Username/Email and password both required.';
            }
        }
    }]);

//////////////////////////
// Registration Controller
techhive.controller('registration', ['$scope', '$http', '$state', function ($scope, $http, $state) {
        //init
        $scope.register = {};
        //register user here
        $scope.registerUser = function () {
            if ($scope.isNotEmpty($scope.register.email) && $scope.isNotEmpty($scope.register.username) && $scope.isNotEmpty($scope.register.password)) {
                $scope.isError = "";
                console.log($scope.register);

                $http.post("/registerUser", $scope.register).success(function (data) {
                    if (data) {
                        if ($scope.file) { //check if from is valid
                            $scope.upload($scope.file); //call upload function
                        }
                        $state.go('login');
                    } else {
                        $scope.isError = "your email or username already regitred with us."
                    }
                });
            } else {
                $scope.isError = 'All fields are required.';
            }
        }

//image upload start
        $scope.upload = function (file) {
            Upload.upload({
                url: '/uploadImg', //webAPI exposed to upload the file
                data: {file: file} //pass file as data, should be user ng-model
            });
        };
    }]);

///////////////////////
// videoCall Controller

techhive.controller('home', ['$scope', '$window', '$timeout', 'Room', '$http', 'socket', function ($scope, $window, $timeout, Room, $http, socket) {
        //init
        $scope.message = {};
        $scope.roomViseMsg = [];

        /////////////
        // onlogin success function
        $scope.onLoginSuccess = function () {
            $scope.isLogin = true;
            var index = -1;
            $scope.activeUsername = JSON.parse($window.localStorage.getItem("isLoginUser"));
            console.log($scope.activeUsername);
//            socket.emit("updateOnlineStatus", {userId: $scope.activeUsername._id});
            $http.get("/allUserRightSideList").success(function (allUsersList) {
                console.log(allUsersList);
                $scope.allUserList = allUsersList;
                $scope.connectedUser = [];
//                        console.log($scope.allUserList);
                angular.forEach($scope.allUserList, function (value, key) {
                    angular.forEach($scope.activeUsername.connectedUser, function (v1, k) {
                        //socket.emit('openRoom', v1.roomId);
                        if (v1.userId == value._id) {
                            $scope.allUserList[key].roomId = v1.roomId;
                            $scope.connectedUser.push(value);
                        }
                    });
                    if (value._id == $scope.activeUsername._id) {
                        index = key;
                    }
                });
                if (index > -1) {
                    $scope.allUserList.splice(index, 1);
                }
            });
        };
        $scope.onLoginSuccess();
        $scope.connectUserRoom = function (user) {
            console.log(user);
            if (angular.isUndefined(user.roomId)) {
                $http.post("/connectUserRoom", {me: $scope.activeUsername, with : user}).then(function (data) {
                    var index = -1;
                    data = data.data;
                    //console.log(data);
                    //console.log($scope.allUserList);
                    //if (data.length) {
                    //socket.emit('openRoom', data);
                    $scope.openRoom = data;
                    //console.log($scope.openRoom);

                    angular.forEach($scope.allUserList, function (value, key) {
                        console.log("val: " + value._id + " id: " + user._id);
                        if (value._id === user._id) {
//                                console.log("log: "+key);
                            return index = key;
                        }
                    });
                    if (index > -1) {
                        $scope.allUserList[index].roomId = data;
                    }
                    //}
                    $scope.switchRoom($scope.openRoom);
                });
            } else {
                //socket.emit('openRoom', user.roomId);
                $scope.openRoom = user.roomId;
                console.log($scope.openRoom);
                $scope.switchRoom($scope.openRoom);

            }


            $scope.chatWith = user;
        };
        // video call
        $scope.call=function(){
            Room.init($scope.activeUsername.username, $scope.openRoom);
        }
//switch room on click user
        $scope.switchRoom = function (roomId) {
            console.log("switch room call");
            if (roomId) {
                $scope.activeMsg = $scope.roomViseMsg[roomId];
//                            console.log($scope.activeMsg ); 
            } else {
                $scope.activeMsg = [];
            }
            $timeout(function () {
                var $chat = $('#chatWindow');
                //$chat.animate({scrollTop: $chat.prop("scrollHeight")}, 10);
                var scrollTo_val = $chat.prop('scrollHeight') + 'px';
                //$chat.slimScroll({scrollTo: scrollTo_val});
            }, 100);

        };
        //update user list.
        socket.on('allRoomMsg', function (data) {
            $scope.allRoomMsg = data;
            //console.log($scope.allRoomMsg.length);
            angular.forEach($scope.allRoomMsg, function (value, key) {
                $scope.roomViseMsg[value.roomId] = value.messages;
            });
            $scope.switchRoom($scope.openRoom);

        });
        //**********
        //single message.
        socket.on('OneRoomMsg', function (data) {
            console.log("oneroom call");
            if ($scope.roomViseMsg.hasOwnProperty(data.roomId)) {
                $scope.roomViseMsg[data.roomId].push(data.messages[0]);
            } else {
                $scope.roomViseMsg[data.roomId] = data.messages;

            }
            $scope.switchRoom($scope.openRoom);
        });
        //**********
        // send message
        $scope.sendMsg = function () {
            console.log("send msg call " + $scope.openRoom + " messag: " + $scope.message.text);
            if ($scope.isNotEmpty($scope.message.text) && $scope.isNotEmpty($scope.openRoom)) {
                socket.emit("sendMessage", {msg: $scope.message.text, roomId: $scope.openRoom, id: $scope.activeUsername._id});
                $scope.message.text = "";
            }
        }
// logout user
        $scope.logoutUser = function () {
            console.log("logout call");
            $window.localStorage.removeItem("isLoginUser");
            //socket.disconnect();
        };
        $scope.$on('localVideo.update', function (e) {
            if (Room.localStream)
                $scope.localVideo = URL.createObjectURL(Room.localStream);
            else
                $scope.localVideo = null;
            if ($scope.status.streamType == 'camera')
                $scope.localVideoTransform = '-webkit-transform : scaleX(-1)';
            else
                $scope.localVideoTransform = '';
            $scope.$apply();
        });

        $scope.$on('userVideo.update', function (e, user) {
            $scope.$apply($scope.users[user].video = Room.users[user].streams.map(function (stream) {
                return URL.createObjectURL(stream)
            }));
        });

        $scope.$on('userlist.update', function (e) {
            $scope.$apply($scope.users = Room.users);
        });

        $scope.$on('messageLog.update', function (e) {
            $scope.$apply($scope.messageLog = Room.messageLog);
            e = $('#messageLog');
            e.scrollTop(e[0].scrollHeight);
        });



        $scope.log = function (msg) {
            log('interface', msg);
        };

        $scope.room = Room;
        $scope.username = Room.username;
        $scope.roomname = Room.roomname;
        $scope.users = Room.users;
        $scope.status = Room.status;
        $scope.messageLog = Room.messageLog;
        $scope.msg = "";

//        setInterval(function () {
//            if (document.URL != Room.url)
//                location.reload();
//        },1000);

    }]);



////////////
// Room Service
techhive.service('Room', ['$rootScope', function ($rootScope) {

        navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.getUserMedia;
        window.RTCPeerConnection = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
        window.RTCPSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
        window.RTCIceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;

        var room = {

            cons: {
                camera: {'video': true, 'audio': true},
                audioOnly: {'video': false, 'audio': true},
                screen: {'video': {mandatory: {chromeMediaSource: 'screen'}}, 'audio': false}
            },

            status: {
                connected: false,
                muted: false,
                smuted: false,
                vmuted: false,
                mod: false,
                streamType: 'camera',
            },

            roomname: "",
            username: "",
            localStream: null,
            users: {},
            socket: "",
            messageLog: [],

            init: function (userName, roomName) {
                console.log("inint  call: "+userName+" room: "+roomName);
                if (document.URL.match(/#/g).length !== 1) {
                    var name = prompt("Please enter your user name", "");
                    window.location.href = document.URL + '#' + name;	// Needs to be changed
                }
                this.url = window.location.host;
                //console.log(window.location.host);
                this.username = userName || '';
                this.roomname = roomName;
                this.socket = io("http://localhost:4000/");
                this.status.connected = true;

                // Socket events init

                this.socket.on('connect', function () {
                    this.emit('connectWithUser', room.username, room.roomname);
                    log('room', 'Room: ' + room.roomname + ', User: ' + room.username);
                });

                this.socket.on('userlist', function (list) {
                    if (list.length > 0)
                        document.body.style.backgroundImage = 'url(bg2.jpg)';
                    list.map(function (x) {
                        room.users[x] = {'pc': '', 'streams': [], 'dc': {}, 'stats': {}, 'status': {'muted': false}};
                    });
                    room.initStream(room.cons.camera);
                });

                this.socket.on('hello', function (from, data) {
                    document.body.style.backgroundImage = 'url(bg2.jpg)';
                    room.userAdd(from);
                });

                this.socket.on('bye', function (from, data) {
                    room.userDel(from);
                    if (Object.keys(room.users).length == 0)
                        document.body.style.backgroundImage = 'url(bg.jpg)';
                });

                this.socket.on('message', function (from, data) {
                    if (from !== room.username) {
                        var d = new Date();
                        var minutes = d.getMinutes() > 9 ? d.getMinutes() : '0' + d.getMinutes();
                        room.messageLog.push({'user': from, 'msg': data, 'time': d.getHours() + ':' + d.getMinutes()});
                        $rootScope.$broadcast('messageLog.update');
                    }
                });

                this.socket.on('offer', function (from, data) {
                    log('call', 'Call received: ' + JSON.stringify(data));
                    if (!room.status.muted)
                        room.users[from].pc.addStream(room.localStream);
                    room.users[from].pc.setRemoteDescription(new RTCSessionDescription(data));
                    room.users[from].pc.createAnswer(function (answer) {
                        room.users[from].pc.setLocalDescription(answer);
                        room.socket.emit('answer', from, answer);
                    }, function (err) {
                        log('error', err);
                    }, {});
                });

                this.socket.on('answer', function (from, data) {
                    log('call', 'Response received: ' + JSON.stringify(data));
                    room.users[from].pc.setRemoteDescription(new RTCSessionDescription(data));
                });

                this.socket.on('ice', function (from, data) {
                    log('ice', 'ICE  candidate received: ' + JSON.stringify(data));
                    if (data)
                        room.users[from].pc.addIceCandidate(new RTCIceCandidate(data));
                });

                this.socket.on('admin', function (user, data) {
                    log('room', 'Updated status: ' + JSON.stringify(data));
                    if (room.username === user)
                        switch (data) {
                            case 'mod':
                                room.status.mod = true;
                                break;
                            case 'mute':
                                room.status.muted = true;
                                for (var user in room.users)
                                    room.users[user].pc.removeStream(room.localStream);
                                room.localStream.stop();
                                break;
                            case 'unmute':
                                room.status.muted = false;
                                room.initStream(room.cons.camera);
                                break;
                        }
                    else
                        switch (data) {
                            case 'mute':
                                room.users[user].status.muted = true;
                                break;
                            case 'unmute':
                                room.users[user].status.muted = false;
                                break;
                        }
                });

                this.socket.on('disconnect', function () {
                    for (var user in room.users)
                        room.userDel(user);
                    if (room.localStream)
                        room.localStream.stop();
                });
            },

            userAdd: function (user) {
                if (user) {
                    if (!this.users[user])
                        this.users[user] = {'pc': '', 'streams': [], 'dc': {}, 'stats': {}, 'status': {'muted': false}};
                    this.users[user].pc = new RTCPeerConnection({iceServers: [{url: "stun:stun.l.google.com:19302"}]}, {optional: [{RtpDataChannels: true}]});
                    this.users[user].pc.onconnecting = function (message) {
                        log('call', 'Connecting..');
                    };
                    this.users[user].pc.onopen = function (message) {
                        log('call', 'Call established.');
                    };
                    this.users[user].pc.onaddstream = function (event) {
                        log('call', 'Stream coming from the other side.');
                        room.users[user].streams.push(event.stream);
                        $rootScope.$broadcast('userVideo.update', user);
                        room.users[user].stats.catcher = setInterval(room.getBitrate, 5000, user);
                    };
                    this.users[user].pc.onremovestream = function (event) {
                        log('call', 'Stream removed from the other side');
                        room.users[user].streams.splice(room.users[user].streams.indexOf(event.stream), 1);
                        $rootScope.$broadcast('userVideo.update', user);
                        clearInterval(room.users[user].stats.catcher);
                        room.users[user].stats = {};
                    };
                    this.users[user].pc.onicecandidate = function (event) {
                        room.socket.emit('ice', user, event.candidate);
                    };
                    if (!this.status.muted)
                        this.users[user].pc.addStream(this.localStream);
                    this.users[user].pc.ondatachannel = function (event) {
                        if (!room.users[user].dc.channel)
                            room.initDC(user, event.channel);
                    };
                    $rootScope.$broadcast('userlist.update');
                }
            },

            userDel: function (user) {
                if (this.users[user]) {
                    clearInterval(this.users[user].stats.catcher);
                    delete this.users[user];
                }
                $rootScope.$broadcast('userlist.update');
            },

            call: function (user) {
                if (typeof (this.users[user]) !== 'undefined') {
                    if (!this.users[user].dc.channel)
                        this.initDC(user, this.users[user].pc.createDataChannel('data'));
                    this.users[user].pc.createOffer(function (offer) {
                        room.users[user].pc.setLocalDescription(offer);
                        room.socket.emit('offer', user, offer);
                    }, function (err) {
                        log('error', err);
                    }, {});
                }
            },

            sendMsg: function (msg) {
                var d = new Date();
                var minutes = d.getMinutes() > 9 ? d.getMinutes() : '0' + d.getMinutes();
                this.messageLog.push({'user': this.username, 'msg': msg, 'time': d.getHours() + ':' + minutes});
                this.socket.emit('message', msg);
                $rootScope.$broadcast('messageLog.update');
            },

            sendFile: function (user) {
                if (this.users[user].dc.sending) {
                    alert('You are already sending a file to the user, wait until it is finished.');
                    return;
                }
                ;
                var filer = document.createElement('input');
                filer.setAttribute('type', 'file');
                filer.addEventListener('change', function () {
                    if (filer.files && filer.files[filer.files.length - 1]) {
                        var file = filer.files[filer.files.length - 1];
                        var fr = new FileReader();
                        fr.onload = function (e) {
                            var reader = new window.FileReader();
                            var chunkLength = 1150;
                            reader.readAsDataURL(file);
                            reader.onload = onReadAsDataURL;

                            function onReadAsDataURL(event, text) {
                                var data = {};
                                if (event)
                                    text = event.target.result;
                                if (text.length > chunkLength) {
                                    data.message = text.slice(0, chunkLength);
                                } else {
                                    data.message = text;
                                    data.last = true;
                                    data.name = file.name;
                                    room.users[user].dc.sending = false;
                                }
                                room.users[user].dc.channel.send(JSON.stringify(data));

                                var remaining = text.slice(data.message.length);

                                if (remaining.length) {
                                    setTimeout(function () {
                                        onReadAsDataURL(null, remaining);
                                    }, 400);
                                }
                            }
                        };
                        fr.readAsText(file);
                    }
                });
                filer.click();
                this.users[user].dc.sending = true;

            },

            switchStream: function (type) {
                this.status.streamType = type;
                if (this.status.streamType !== type)
                    this.initStream(this.cons[type]);
            },

            initStream: function (cons) {

                navigator.getUserMedia(cons, this.onMediaSuccess, this.onMediaError);
            },

            onMediaSuccess: function (stream) {
                var oldStream = room.localStream;
                room.localStream = stream;
                for (var user in room.users) {
                    if (room.users[user].pc === '')
                        room.userAdd(user);
                    if (oldStream)
                        room.users[user].pc.removeStream(oldStream);
                    if (!room.status.muted)
                        room.users[user].pc.addStream(room.localStream);
                    room.call(user);
                }
                if (oldStream)
                    oldStream.stop();
                $rootScope.$broadcast('localVideo.update');
            },

            onMediaError: function (error) {
                alert("Error on getUserMedia: " + error);
            },

            initDC: function (user, channel) {
                log('channel', channel);
                this.users[user].dc = {};
                this.users[user].dc.buffer = [];
                this.users[user].dc.sending = false;
                this.users[user].dc.channel = channel;

                channel.onopen = function () {
                    log('channel', 'Channel created with ' + user);
                };
                channel.onclose = function () {
                    log('channel', 'Channel closed with ' + user);
                };
                channel.onerror = function (err) {
                    log('channel', 'Channel error: ' + err);
                };
                // Receiving files
                channel.onmessage = (data) => {
                    data = JSON.parse(data);
                    users[user].dc.buffer.push(data.message);

                    if (data.last) {
                        var save = document.createElement('a');
                        save.href = this.users[user].dc.buffer.join('');
                        save.target = '_blank';
                        save.download = data.name;
                        save.click();
                        // var event = document.createEvent('Event');
                        // event.initEvent('click', true, true);
                        // save.dispatchEvent(event);
                        // (window.URL || window.webkitURL).revokeObjectURL(save.href);
                        this.users[user].dc.buffer = [];
                    }
                };
                log('channel', channel.readyState)
            },

            admin: function (op, user) {
                if (user == this.username)
                    switch (op) {
                        case "smute":
                            this.status.smuted = !this.status.smuted;
                            this.localStream.getAudioTracks().forEach(function (track) {
                                track.enabled = !room.status.smuted;
                            });
                            break;
                        case "vmute":
                            this.status.vmuted = !this.status.vmuted;
                            this.localStream.getVideoTracks().forEach(function (track) {
                                track.enabled = !room.status.vmuted;
                            });
                            break;
                    }
                else
                    this.socket.emit('admin', user, op);
            },

            getBitrate: function (user) {
                room.users[user].pc.getStats(function f(stats) {
                    var results = stats.result();
                    results.map(function (res) {
                        if (res.type == 'ssrc' && res.stat('googFrameHeightReceived')) {
                            var bytesNow = res.stat('bytesReceived');
                            if (room.users[user].stats.timestampPrev) {
                                var bitRate = Math.round((bytesNow - room.users[user].stats.bytesPrev) * 8 / (res.timestamp - room.users[user].stats.timestampPrev));
                                log('stats', user + ': ' + bitRate + ' kbits/sec');
                                room.users[user].stats.bitRate = bitRate;
                            }
                            room.users[user].stats.bytesPrev = bytesNow;
                            room.users[user].stats.timestampPrev = res.timestamp;
                        }
                    });
                });
            }

        };

        return room;

    }])
        .factory('socket', function ($rootScope) {
            var socket = io.connect();
            return {
                on: function (eventName, callback) {
                    socket.on(eventName, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            callback.apply(socket, args);
                        });
                    });
                },
                emit: function (eventName, data, callback) {
                    socket.emit(eventName, data, function () {
                        var args = arguments;
                        $rootScope.$apply(function () {
                            if (callback) {
                                callback.apply(socket, args);
                            }
                        });
                    });
                },
                disconnect: function () {

                    return socket.disconnect();

                }
            };
        })

///////////////
// Directives
        .directive("chatInput", ['Room', function (Room) {
                return {
                    link: function (scope, element, attrs) {
                        element.bind("keypress", function (e) {
                            if (e.which === 13 && scope.msg != '') {
                                Room.sendMsg(scope.msg);
                                scope.$apply(scope.msg = '');
                            }
                        });
                    }
                };
            }])
        .directive('showonhover', function () {
            return {
                link: function (scope, element, attrs) {
                    element.bind('mouseenter', function () {
                        element.siblings().fadeIn();
                    });
                }
            };
        })
        .directive('hideonleave', function () {
            return {
                link: function (scope, element, attrs) {
                    element.bind('mouseleave', function () {
                        element.fadeOut();
                    });
                }
            };
        })
        .directive('myEnter', function () {
            return function (scope, element, attrs) {
                element.bind("keydown keypress", function (event) {
                    if (event.which === 13) {
                        scope.sendMsg();
                        scope.$apply(function () {
                            scope.message = "";
                        });
                        event.preventDefault();
                    }
                });
            };
        });
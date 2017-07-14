define([
    'dojo/_base/declare',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dijit/form/Button',
    'JBrowse/Plugin'
],
function (
    declare,
    on,
    dom,
    domStyle,
    domConstruct,
    Button,
    JBrowsePlugin
) {
   return declare(JBrowsePlugin, {
        constructor: function (args) {
            var browser = args.browser;
            console.log('Chat plugin starting');
            this.config = {
                granularity: args.granularity,
                server: args.server,
                currentLoc: args.browser.config.location,
                browser: args.browser,
            }
            this.initChatDiv();
            this.connectChat();
            console.log(args);
            console.log('Chat plugin ready');
        },

        getRoom: function() {
            var room;
            if(this.config.granularity === 'refseq') {
                room = this.config.browser.config.location.split(':')[0];
            } else {
                room = 'instance';
            }
            return room;
        },

        initChatDiv: function() {
            var gb = dom.byId("GenomeBrowser");
            // Change width, we'll fix it later.
            domStyle.set(gb, 'width', '80%');
            domStyle.set(gb, 'float', 'left');
            var body = document.getElementsByTagName('body')[0];
            console.log(body);
            domConstruct.place(
                '<div style="float: left;" id="chatBar">' +
                    '<div id="chatMenuBar" class="menuBar">' +
                        '<span class="dijit dijitReset dijitInline menu dijitDropDownButton">' +
                            '<span class="dijitReset dijitInline dijitButtonNode">' +
                                '<span class="dataset" style="user-select: none;">' +
                                    'Chat' +
                                '</span>' +
                                '<span id="shareButtonGoesHere">' +
                                    'Chat' +
                                '</span>' +
                            '</span>' +
                        '</span>' +
                    '</div>' +
                    '<div id="chatMain">' +
                        '<div id="chatArea" style="width:100%; overflow-y: scroll"></div>' +
                        '<input id="chatInput" style="width:100%" placeholder="Enter your message here">' +
                    '</div>' +
                '</div>', body, 'first')

            var myButton = new Button({
                iconClass: 'dijitEditorIconLink',
                label: "Share View",
                onClick: function(){
                    self.socket.emit('text', {
                        msg: '[location ' + self.config.browser.config.location + ']',
                        loc: self.config.browser.config.location,
                        room: self.getRoom(),
                    });
                }
            }, "shareButtonGoesHere").startup();
            // Fix sizes
            this.updateChatDivSize();
            // Forever
            var self = this;
            on(window, 'resize', function(){
                self.updateChatDivSize()
            })
        },

        updateChatDivSize: function() {
            chat_width = 300
            var width = window.innerWidth;
            var height = window.innerHeight;
            console.log();
            domStyle.set(dom.byId('chatBar'), 'width', chat_width + 'px');
            domStyle.set(dom.byId('chatBar'), 'height', height + 'px');
            domStyle.set(dom.byId('GenomeBrowser'), 'width', (width - chat_width - 30) + 'px');
            var chatMaxHeight = height - 10
                    - dojo.position(dom.byId('chatMenuBar')).h
                    - dojo.position(dom.byId('chatInput')).h;
            domStyle.set(dom.byId('chatArea'), 'height', chatMaxHeight + 'px');
            console.log('max height', chatMaxHeight)
        },

        connectChat: function() {
            var self = this;
            self.socket = null;
            // Per-refseq chat or per-instance chat?
            self.socket = io.connect(self.config.server + '/chat?room=' + self.getRoom())

            self.socket.on('connect', function() {
                self.socket.emit('joined', {
                    room: self.getRoom(),
                });
            });

            self.socket.on('status', function(data) {
                console.log(data);
                if(data.msg) {
                    console.log(data.msg.substring(0, 10));
                    console.log(data.msg.substring(0, 10) === '[location ');
                    if(data.msg.substring(0, 10) === '[location '){
                        console.log(data);
                        $("#chatArea").append(
                            '<div class="status location">' +
                                '<div class="body">' +
                                    '<div class="author">' + data.user.name + ' shared a location ' + data.loc + '</div>' +
                                '</div>' +
                            '</div>'
                        );
                    } else {
                        $("#chatArea").append('<div class="status"><div class="body">' + data.msg + "</div></div>");
                    }
                    $('#chatArea').scrollTop($('#chatArea')[0].scrollHeight);
                } else {
                    if(data.err === "Unauthenticated"){
                        $('#chatArea').append(
                            '<a id="loginButton" href="' + self.config.server + '/login">Login with Google</a>'
                        );
                        //
                    } else {
                        console.log(data);
                    }
                }
            });

            self.socket.on('message', function(data) {
                console.log(data);
                $("#chatArea").append(
                    '<div class="message">' +
                        '<div class="avatar">' +
                            '<img width="50" src="' + data.user.picture + '">' +
                        '</div>' +
                        '<div class="body">' +
                            '<div class="author">' + data.user.name + '</div>' +
                            '<div class="text">' + data.msg + '</div>' +
                        '</div>' +
                    '</div>'
                );
                if($('#chatArea')){
                    $('#chatArea').scrollTop($('#chatArea')[0].scrollHeight);
                }
            });

            $('#chatInput').keypress(function(e) {
                var code = e.keyCode || e.which;
                if (code == 13 && $('#chatInput').val().trim().length > 0) {
                    text = $('#chatInput').val();
                    $('#chatInput').val('');
                    self.socket.emit('text', {
                        msg: text,
                        room: self.getRoom(),
                        loc: self.config.browser.config.location
                    });
                }
            });

            $(window).unload(function(){
                self.socket.emit('left', {room: self.getRoom()}, function() {
                    socket.disconnect();
                });
            });
        },
    });
});

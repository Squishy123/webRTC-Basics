const path = require('path');
const restify = require('restify');
const WebSocket = require('ws');

//web server
let server = restify.createServer();

//wildcard static serving
server.get('/*', restify.plugins.serveStatic({
    directory: path.join(__dirname, '/static')
}));

//serve index.html to root 
server.get('/', restify.plugins.serveStatic({
    directory: path.join(__dirname, '/static/index.html')
}))

server.listen(8000, () => {
    console.log(`Server listening on ${server.name}, ${server.url}`);
});

//ws server
let wsServer = new WebSocket.Server({ port: 3000 });
//keep track of users
let users = [];

//wrapper function for sending
function sendTo(ws, data) {
    ws.send(JSON.stringify(data));
}

wsServer.on('connection', ws => {
    console.log('Client Connected!');


    ws.on('message', message => {
        let data = null;

        try {
            data = JSON.parse(message);
        } catch (err) {
            console.error(err);
        }

        switch (data.type) {
            case 'login':
                //check if username is unique
                if (users[data.username]) {
                    sendTo(ws, { type: 'login', success: false });
                } else {
                    users[data.username] = ws;
                    ws.username = data.username;
                    sendTo(ws, { type: 'login', success: true });
                    console.log(`User ${data.username} logged in!`);
                }
                break;
            case 'logout':
                users[data.username] = null;
                sendTo(ws, { type: 'logout', success: true });
                break;
            case 'offer':
                if(users[data.otherUsername]) {
                    console.log(`Sending offer from ${ws.username} to ${data.otherUsername}`);
                    ws.otherUsername = data.otherUsername;
                    sendTo(users[data.otherUsername], {
                        type: 'offer',
                        offer: data.offer,
                        username: ws.username
                    });
                }
                break;
            case 'answer':
                if(users[data.otherUsername]) {
                    console.log("Sending answer");
                    //console.log(data.answer);
                    ws.otherUsername = data.otherUsername;
                    sendTo(users[data.otherUsername], {
                        type:'answer',
                        answer: data.answer
                    });
                }
                break;
            case 'candidate':
                if(users[data.otherUsername]) {
                    console.log(`New Candidate received`);
                    sendTo(users[data.otherUsername], {
                        type: 'candidate',
                        candidate: data.candidate
                    });
                }
                break;
            case 'default':
                break;
        }
    });

    ws.on('close', () => {
        let k = [...users.keys()].find((e) => {
            return users[e] == ws;
        });
        if (k) {
            console.log(`User ${users[k].username} logged off!`);
            users[k] = null;
        }
    })
});
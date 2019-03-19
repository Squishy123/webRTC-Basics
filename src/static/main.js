//store
let stream, connection, videoElement = document.querySelector('#local')
    , remoteElement = document.querySelector('#remote')
    , loginElement = document.querySelector('.login')
    , usernameElement = document.querySelector('#username')
    , loginButton = document.querySelector('#login')
    , alertsElement = document.querySelector('.alerts')
    , callElement = document.querySelector('.call')
    , callButton = document.querySelector('#call')
    , callUsernameElement = document.querySelector('#callUsername');

let otherUsername;

//config for stun server
let config = {
    iceServers: [{ url: 'stun:stun2.1.google.com:19302' }]
};


//give webcam access and render it in video element
async function getWebCamAccess(e) {
    try {
        //grab webcam video input
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });
        //set video src to stream
        videoElement.srcObject = stream;
    } catch (err) {
        console.error(err);
    }
}

async function removeWebCamAccess(e) {
    try {
        //stop stream
        stream.getVideoTracks().map((track) => {
            track.stop();
        });
        //set src = null
        videoElement.srcObject = null;
    } catch (err) {
        console.error(err);
    }
}

//setup websocket connection
let ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
    console.log(`Connected to WS Server!`);
}

ws.onerror = err => {
    console.error(err);
}

ws.onmessage = msg => {
    //console.log(`Message received: ${msg}`);

    let data = JSON.parse(msg.data);
    switch (data.type) {
        case 'login':
            handleLogin(data.success);
            break;
        case 'logout':
            handleLogout(data.success);
            break;
        case 'offer':
            console.log(data);
            handleOffer(data.offer, data.username);
            break;
        case 'answer':
            handleAnswer(data.answer);
            break;
        case 'candidate':
            handleCandidate(data.candidate);
            break;
    }
}

//wrapper for sending message via ws
function sendMessage(msg) {
    ws.send(JSON.stringify(msg));
}

//creates an alert that removes itself after 5 seconds
function addAlert(msg) {
    //if there are too many alerts remove the oldest one
    if (alertsElement.children.length > 2) {
        alertsElement.removeChild(alertsElement.firstElementChild);
    }

    let alert = document.createElement('div');
    alert.className = 'alert';
    alert.textContent = msg;
    alertsElement.appendChild(alert);


    setTimeout(function () {
        alert.remove();
    }, 1000)
}


function loginReq(e) {
    //check that username is legit
    if (usernameElement.value.length <= 0) {
        addAlert('ERROR: Please enter a username');
        return;
    }

    addAlert(`Logging in with username ${usernameElement.value}`);
    //send login req to server
    sendMessage({
        type: 'login',
        username: usernameElement.value
    });
}

async function handleLogin(success) {
    if (!success) {
        addAlert(`ERROR: Login unsuccessful, username already taken`);
        return;
    }
    addAlert(`Login Successful!`);
    //hide login panels
    [...loginElement.children].forEach(c => {
        if (c != loginButton)
            c.classList.add('hidden');
    });
    loginButton.textContent = "Disconnect";
    loginButton.removeEventListener('click', loginReq);
    loginButton.addEventListener('click', logoutReq);

    //show call panel
    callElement.classList.remove('hidden');

    //turn on cam and get stream
    await getWebCamAccess();

    connection = new RTCPeerConnection(config);
    connection.addStream(stream);

    //console.log(connection);

    //when new remote stream comes in
    connection.onaddstream = event => {
        remoteElement.srcObject = event.stream;
    }

    //when a new icecandidate is received
    connection.onicecandidate = event => {
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                candidate: event.candidate,
                otherUsername: otherUsername
            });
        }
    }
}

//add listener for initial login
loginButton.addEventListener('click', loginReq);

function logoutReq(e) {
    addAlert(`Logging out with username ${usernameElement.value}`);

    sendMessage({
        type: 'logout',
        username: usernameElement.value
    });
}

function handleLogout(success) {
    if (!success) {
        addAlert(`ERROR: Logout Unsuccessful!`);
        return;
    }
    addAlert('Logout Successful!');
    [...loginElement.children].forEach(c => {
        if (c != loginButton)
            c.classList.remove('hidden');
    });
    loginButton.textContent = "Connect";
    loginButton.removeEventListener('click', logoutReq);
    loginButton.addEventListener('click', loginReq);

    //hide call panel
    callElement.classList.add('hidden');

    removeWebCamAccess();
}

function callReq(e) {
    if (callUsernameElement.value.length <= 0) {
        addAlert(`ERROR: Please enter a username!`);
        return;
    }

    otherUsername = callUsernameElement.value;
    //console.log(otherUsername);
    connection.createOffer(
        offer => {
            sendMessage({
                type: 'offer',
                offer: offer,
                otherUsername: otherUsername
            });

            connection.setLocalDescription(offer);
        },
        error => {
            addAlert(`ERROR: Offer creation error!`);
        }
    )

}

function stopReq(e) {
    otherUsername = null;
    remoteElement.src = null;
    connection.close();
    connection.onicecandidate = null;
    connection.onaddstream = null;

    callButton.removeEventListener('click', stopReq);
    callButton.addEventListener('click', callReq);
}

//add callreq listener
callButton.addEventListener('click', callReq);

async function handleOffer(offer, username) {
    console.log("Handling offer!");
    otherUsername = username;
    await connection.setRemoteDescription(new RTCSessionDescription(offer));
    await connection.createAnswer(
        answer => {
            connection.setLocalDescription(answer);
            sendMessage({ type: 'answer', 
            answer: answer, 
            otherUsername: username });
        },
        error => {
            addAlert(`ERROR: Answer creation error!`);
        }
    )
}

async function handleAnswer(answer) {
    console.log(`Handle Answers:${answer}`);
    await connection.setRemoteDescription(new RTCSessionDescription(answer));

    callButton.textContent = "Drop";
    callButton.removeEventListener('click', callReq);
    callButton.addEventListener('click', stopReq);
}

async function handleCandidate(candidate) {
    console.log(`Handle candidate`);
    await connection.addIceCandidate(new RTCIceCandidate(candidate));

    callButton.textContent = "Call";
    callButton.removeEventListener('click', stopReq);
    callButton.addEventListener('click', callReq);
}
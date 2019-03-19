//store
let stream, videoElement = document.querySelector('#vidStream')
    , loginElement = document.querySelector('.login')
    , usernameElement = document.querySelector('#username')
    , loginButton = document.querySelector('#login')
    , alertsElement = document.querySelector('.alerts');


//config for stun server
let config = {
    iceServers: [{url: 'stun: stun2.1.google.com:19302'}]
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
    console.log(`Message received: ${msg}`);

    let data = JSON.parse(msg.data);
    switch (data.type) {
        case 'login':
            handleLogin(data.success);
            break;
        case 'logout':
            handleLogout(data.success);
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

function handleLogin(success) {
    if (!success)
        addAlert(`ERROR: Login unsuccessful, username already taken`)
    else {
        addAlert(`Login Successful!`);
        [...loginElement.children].forEach(c => {
            if(c != loginButton)
                c.classList.add('hidden');
        });
        loginButton.textContent = "Disconnect";
        loginButton.removeEventListener('click', loginReq);
        loginButton.addEventListener('click', logoutReq);

        getWebCamAccess();
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
    if(!success) {
        addAlert(`ERROR: Logout Unsuccessful!`);
    } else {
        addAlert('Logout Successful!');
        [...loginElement.children].forEach(c => {
            if(c != loginButton)
                c.classList.remove('hidden');
        });
        loginButton.textContent = "Connect";
        loginButton.removeEventListener('click', logoutReq);
        loginButton.addEventListener('click', loginReq);

        removeWebCamAccess();
    }
}

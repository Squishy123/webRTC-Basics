//store
let stream, videoElement = document.querySelector('#vidStream')
    , accessButton = document.querySelector('#getAccess')
    , loginElement = document.querySelector('.login')
    , usernameElement = document.querySelector('#username')
    , loginButton = document.querySelector('#login')
    , alertsElement = document.querySelector('.alerts');

//give webcam access and render it in video element
async function getWebCamAccess(e) {
    try {
        //grab webcam video input
        stream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
        //set video src to stream
        videoElement.srcObject = stream;
        //button label
        accessButton.textContent = `Close Webcam`;

        //add close event listener
        accessButton.removeEventListener('click', getWebCamAccess);
        accessButton.addEventListener('click', removeWebCamAccess);
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
        //button label
        accessButton.textContent = `Open Webcam`;

        //add open event listener
        accessButton.removeEventListener('click', removeWebCamAccess);
        accessButton.addEventListener('click', getWebCamAccess);
    } catch (err) {
        console.error(err);
    }
}

//add button listener
accessButton.addEventListener('click', getWebCamAccess);


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
        loginButton.textContent = "logout";
        loginButton.removeEventListener('click', loginReq);
        loginButton.addEventListener('click', logoutReq);
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
        loginButton.textContent = "login";
        loginButton.removeEventListener('click', logoutReq);
        loginButton.addEventListener('click', loginReq);
    }
}

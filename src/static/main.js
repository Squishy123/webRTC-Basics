//store
let stream, videoElement = document.querySelector('#vidStream'), accessButton = document.querySelector('#getAccess');

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
        accessButton.textContent = `Close webcam`;
   
        //add close event listener
        accessButton.removeEventListener('click', getWebCamAccess);
        accessButton.addEventListener('click', removeWebCamAccess);
    } catch(err) {
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
        videoElement.srcObject  = null;
        //button label
        accessButton.textContent = `Gain Access To Camera`;

        //add open event listener
        accessButton.removeEventListener('click', removeWebCamAccess);
        accessButton.addEventListener('click', getWebCamAccess);
    } catch (err) {
        console.error(err);
    }
}

//add button listener
accessButton.addEventListener('click', getWebCamAccess);
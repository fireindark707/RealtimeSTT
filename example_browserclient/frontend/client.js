let socket = new WebSocket("ws://localhost:8001");
let displayDiv = document.getElementById('textDisplay');
let translationDisplayDiv = document.getElementById('translationDisplay');
let historyDisplayDiv = document.getElementById('historyDisplay');
let server_available = false;
let mic_available = false;
let fullSentences = [];
let fullSentencesTranslation = [];

const serverCheckInterval = 5000; // Check every 5 seconds

function connectToServer() {
    socket = new WebSocket("ws://localhost:8001");

    socket.onopen = function(event) {
        server_available = true;
        start_msg();
    };

    socket.onmessage = function(event) {
        let data = JSON.parse(event.data);

        if (data.type === 'realtime') {
            displayRealtimeText(data.text, displayDiv, fullSentences);
            translateText(data.text).then(translation => {
                displayRealtimeText(translation, translationDisplayDiv, fullSentencesTranslation);
            });
        } else if (data.type === 'fullSentence') {
            fullSentences.push(data.text);
            displayRealtimeText("", displayDiv, fullSentences); // Refresh display with new full sentence
            translateText(data.text).then(translation => {
                fullSentencesTranslation.push(translation);
                displayRealtimeText("", translationDisplayDiv, fullSentencesTranslation); // Refresh display with new full sentence
            });
        }
    };

    socket.onclose = function(event) {
        server_available = false;
    };
}

socket.onmessage = function(event) {
    let data = JSON.parse(event.data);

    if (data.type === 'realtime') {
        displayRealtimeText(data.text, displayDiv, fullSentences);
        translateText(data.text).then(translation => {
            displayRealtimeText(translation, translationDisplayDiv, fullSentencesTranslation);
        });
    } else if (data.type === 'fullSentence') {
        fullSentences.push(data.text);
        displayRealtimeText("", displayDiv, fullSentences); // Refresh display with new full sentence
        translateText(data.text).then(translation => {
            fullSentencesTranslation.push(translation);
            displayRealtimeText("", translationDisplayDiv, fullSentencesTranslation); // Refresh display with new full sentence
            let mixedSentences = fullSentences.map((sentence, index) => {
                return `<span>${sentence} (${fullSentencesTranslation[index]})</span>`;
            });
            historyDisplayDiv.innerHTML = mixedSentences.join('<br>');
        });
    }
};

function displayRealtimeText(realtimeText, displayDiv, fullSentences=[]) {
    let displayedText = fullSentences.map((sentence, index) => {
        let span = document.createElement('span');
        span.textContent = sentence + " ";
        span.className = index % 2 === 0 ? 'yellow' : 'cyan';
        span.className += ' text-display';
        return span.outerHTML;
    }).join('<br>') + '<br>' + realtimeText;

    displayDiv.innerHTML = '<div style="flex-grow: 1;"></div>' + displayedText;
}

function translateText(text) {
    const targetLang = "zh-tw"; // 如果无法获取用户语言，则默认为繁体中文
    const sourceLang = "auto"; // 使用请求中的原始语言或默认为自动检测

    const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&hl=en-US&dt=t&dt=bd&dj=1&source=input&q=${encodeURIComponent(text)}`;

    // 返回一个 Promise，确保调用时可以使用 .then()
    return fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const translation = data.sentences.map((s) => s.trans).join(" ");
            return translation; // 确保返回翻译结果
        })
        .catch(err => {
            console.error(err);
            return "Error: Translation";
        });
}

function start_msg() {
    if (!mic_available)
        displayRealtimeText("🎤  please allow microphone access  🎤", displayDiv);
    else if (!server_available)
        displayRealtimeText("🖥️  please start server  🖥️", displayDiv);
    else
        displayRealtimeText("👄  start speaking  👄", displayDiv);
        displayRealtimeText("👄  start speaking  👄", translationDisplayDiv);
};

// Check server availability periodically
setInterval(() => {
    if (!server_available) {
        connectToServer();
    }
}, serverCheckInterval);

start_msg()

socket.onopen = function(event) {
    server_available = true;
    start_msg()
};

// Request access to the microphone
navigator.mediaDevices.getUserMedia({ audio: true })
.then(stream => {
    let audioContext = new AudioContext();
    let source = audioContext.createMediaStreamSource(stream);
    let processor = audioContext.createScriptProcessor(256, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);
    mic_available = true;
    start_msg()

    processor.onaudioprocess = function(e) {
        let inputData = e.inputBuffer.getChannelData(0);
        let outputData = new Int16Array(inputData.length);

        // Convert to 16-bit PCM
        for (let i = 0; i < inputData.length; i++) {
            outputData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        // Send the 16-bit PCM data to the server

        if (socket.readyState === WebSocket.OPEN) {
            // Create a JSON string with metadata
            let metadata = JSON.stringify({ sampleRate: audioContext.sampleRate });
            // Convert metadata to a byte array
            let metadataBytes = new TextEncoder().encode(metadata);
            // Create a buffer for metadata length (4 bytes for 32-bit integer)
            let metadataLength = new ArrayBuffer(4);
            let metadataLengthView = new DataView(metadataLength);
            // Set the length of the metadata in the first 4 bytes
            metadataLengthView.setInt32(0, metadataBytes.byteLength, true); // true for little-endian
            // Combine metadata length, metadata, and audio data into a single message
            let combinedData = new Blob([metadataLength, metadataBytes, outputData.buffer]);
            socket.send(combinedData);
        }
    };
})
.catch(e => console.error(e));
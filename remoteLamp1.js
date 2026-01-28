console.log("remoteLamp1.js running with ESP32 JSON heartbeat");

// ------------------------------------------------------
// UI + Fader Variables
// ------------------------------------------------------
let faderValue = 50;
let handleY;
let trackTop = 83;
let trackBottom = 570;
let handleHeight = 40;
let dragging = false;
let myOliveGreen;
let myGrey;
let toggleState = false;
let lightConfirm = 0;

// ------------------------------------------------------
// HEARTBEAT STATE
// ------------------------------------------------------
let lastHeartbeatTime = 0;   // updated ONLY when ESP32 sends heartbeat
const HEARTBEAT_TIMEOUT = 6000; // ms

// ------------------------------------------------------
// MQTT CLIENT SETUP
// ------------------------------------------------------
const client = mqtt.connect("wss://h2818280.ala.asia-southeast1.emqxsl.com:8084/mqtt", {
  username: "paddiaddison2016@gmail.com",
  password: "emqPad!91065",
  clientId: "web-ui-" + Math.random().toString(16).substr(2, 8)
});

// ------------------------------------------------------
// LED FLASH FUNCTIONS
// ------------------------------------------------------
function flashGreen() {
  const led = document.getElementById("heartbeat-led");
  led.style.background = "rgb(0, 200, 0)";
  setTimeout(() => led.style.background = "rgb(80, 80, 80)", 120);
}

function flashRed() {
  const led = document.getElementById("heartbeat-led");
  led.style.background = "rgb(200, 0, 0)";
  setTimeout(() => led.style.background = "rgb(80, 80, 80)", 200);
}

// ------------------------------------------------------
// MQTT EVENT HANDLERS
// ------------------------------------------------------
client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("test/esp32/out");
  client.subscribe("test/esp32/status");   // LWT online/offline
});

client.on("close", () => {
  console.log("MQTT connection closed");
  flashRed();
});

client.on("offline", () => {
  console.log("MQTT offline");
  flashRed();
});

client.on("error", () => {
  console.log("MQTT error");
  flashRed();
});

// ------------------------------------------------------
// MQTT MESSAGE HANDLER
// ------------------------------------------------------
client.on("message", (topic, payload) => {
  const text = payload.toString();
  console.log("MQTT:", topic, text);

  // -------------------------
  // LWT STATUS
  // -------------------------
  if (topic === "test/esp32/status") {
    if (text === "offline") flashRed();
    return;
  }

  // -------------------------
  // MAIN ESP32 OUT TOPIC
  // -------------------------
  try {
    const data = JSON.parse(text);

    // -------------------------
    // HEARTBEAT RECEIVED
    // -------------------------
    if (data.heartbeat !== undefined) {
      lastHeartbeatTime = performance.now();
      flashGreen();
      return;
    }

    // -------------------------
    // FADER UPDATE
    // -------------------------
    if (data.faderValue !== undefined) {
      faderValue = data.faderValue;
      handleY = map(faderValue, 0, 100, trackBottom, trackTop);
    }

  } catch (err) {
    console.log("Non‑JSON message:", text);
  }
});

// ------------------------------------------------------
// HEARTBEAT TIMEOUT CHECK
// ------------------------------------------------------
setInterval(() => {
  const now = performance.now();
  if (now - lastHeartbeatTime > HEARTBEAT_TIMEOUT) {
    flashRed();
  }
}, 1000);


//------------------------------------------------------
// P5 SETUP
// ------------------------------------------------------
function setup() {
  let c = createCanvas(300, 650);
  myOliveGreen = color(65, 87, 27);
  myGrey = color(180, 180, 180);

  c.parent("sketch-container");

  c.elt.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  c.elt.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

  handleY = map(faderValue, 0, 100, trackBottom, trackTop);

  // -------------------------------
  // TOGGLE BUTTON
  // -------------------------------
  const toggleBox = document.getElementById("toggleButton-display");
  toggleBox.style.background = myGrey;
  toggleBox.textContent = "OFF";

  toggleBox.addEventListener("click", () => {
    toggleState = !toggleState;

    toggleBox.style.background = toggleState ? myOliveGreen.toString() : myGrey;
    toggleBox.textContent = toggleState ? "ON" : "OFF";

    client.publish("test/esp32/in", JSON.stringify({ toggleState }));
  });
}

// ------------------------------------------------------
// P5 DRAW LOOP
// ------------------------------------------------------
function draw() {
  clear();

  noStroke();
  fill(myGrey);
  rect(73, trackTop, 10, trackBottom - trackTop);

  let handleColor = toggleState ? myOliveGreen : myGrey;
  let valueColor = toggleState ? myOliveGreen : myGrey;

  stroke(0);
  strokeWeight(2);
  fill(handleColor);
  rect(43, handleY - handleHeight / 2, 68, handleHeight, 10);

  const valueBox = document.getElementById("value-display");
  valueBox.textContent = faderValue;
  valueBox.style.color = valueColor.toString();

  lightConfirm = faderValue;
  let confirmColor = lerpColor(color(myGrey), color(255, 255, 150), lightConfirm / 100);
  document.getElementById("lightConfirm-display").style.background = confirmColor.toString();

  if (dragging) {
    let y = getPointerY();
    handleY = constrain(y, trackTop, trackBottom);
    faderValue = Math.round(map(handleY, trackBottom, trackTop, 0, 100));
  }
}

// ------------------------------------------------------
// INPUT HANDLERS
// ------------------------------------------------------
function mousePressed() { startDrag(mouseX, mouseY); }
function mouseReleased() {
  dragging = false;
  client.publish("test/esp32/in", JSON.stringify({ faderValue }));
}

function touchStarted() {
  let t = touches[0];
  startDrag(t.x, t.y);
}

function touchEnded() {
  dragging = false;
  client.publish("test/esp32/in", JSON.stringify({ faderValue }));
}

function startDrag(x, y) {
  if (x > 30 && x < 125 && y > handleY - handleHeight / 2 && y < handleY + handleHeight / 2) {
    dragging = true;
  } else if (x > 30 && x < 125 && y > trackTop && y < trackBottom) {
    dragging = true;
    handleY = y;
    faderValue = Math.round(map(handleY, trackBottom, trackTop, 0, 100));
  }
}

function getPointerY() {
  return touches.length > 0 ? touches[0].y : mouseY;
}
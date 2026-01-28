console.log("remoteLamp1.js is running");

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

// Heartbeat timer
let heartbeatTimer = null;
let lastHeartbeatTime = 0;

// ------------------------------------------------------
// HEARTBEAT TIMEOUT CHECK (runs every second)
// ------------------------------------------------------
setInterval(() => {
  const now = performance.now();

  // If no heartbeat received for > 5 seconds → ESP32 offline
  if (now - lastHeartbeatTime > 5000) {
    flashHeartbeatRed();
  }

}, 1000);


// ------------------------------------------------------
// MQTT CLIENT SETUP
// ------------------------------------------------------
const client = mqtt.connect("wss://h2818280.ala.asia-southeast1.emqxsl.com:8084/mqtt", {
  username: "paddiaddison2016@gmail.com",
  password: "emqPad!91065",
  clientId: "web-ui-" + Math.random().toString(16).substr(2, 8)
});

// ------------------------------------------------------
// HEARTBEAT LED FUNCTIONS
// ------------------------------------------------------
function flashHeartbeatGreen() {
  const led = document.getElementById("heartbeat-led");
  led.style.background = "rgb(0, 200, 0)";
  setTimeout(() => {
    led.style.background = "rgb(80, 80, 80)";
  }, 120);
}

function flashHeartbeatRed() {
  const led = document.getElementById("heartbeat-led");
  led.style.background = "rgb(200, 0, 0)";
  setTimeout(() => {
    led.style.background = "rgb(80, 80, 80)";
  }, 200);
}

// ------------------------------------------------------
// MQTT EVENT HANDLERS
// ------------------------------------------------------
client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("test/esp32/out");

  // Start heartbeat only when connected
  heartbeatTimer = setInterval(() => {
    client.publish("test/esp32/in", JSON.stringify({ heartbeat: true }));
    flashHeartbeatGreen();
  }, 2000);
});

client.on("close", () => {
  console.log("MQTT connection closed");

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  flashHeartbeatRed();
});

client.on("offline", () => {
  console.log("MQTT offline");

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  flashHeartbeatRed();
});

client.on("error", () => {
  console.log("MQTT error");

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  flashHeartbeatRed();
});

// ------------------------------------------------------
// MQTT INCOMING MESSAGE HANDLER
// ------------------------------------------------------
client.on("message", (topic, payload) => {
  const text = payload.toString();
  console.log("RAW MQTT:", text);

  if (data.heartbeat !== undefined) {
    flashHeartbeatGreen();
    lastHeartbeatTime = millis();
}


  try {
    const data = JSON.parse(text);
    console.log("MQTT update:", data);

    if (data.faderValue !== undefined) {
      faderValue = data.faderValue;
      handleY = map(faderValue, 0, 100, trackBottom, trackTop);
    }

  } catch (err) {
    console.log("Non‑JSON MQTT message:", text);
  }
});

// ------------------------------------------------------
// P5 SETUP
// ------------------------------------------------------
function setup() {
  let c = createCanvas(300, 650);
  myOliveGreen = color(65, 87, 27);
  myGrey = color(180, 180, 180);

  c.parent("sketch-container");

  // Prevent page scrolling while touching the canvas
  c.elt.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  c.elt.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

  handleY = map(faderValue, 0, 100, trackBottom, trackTop);

  // -------------------------------
  // TOGGLE BUTTON SETUP
  // -------------------------------
  const toggleBox = document.getElementById("toggleButton-display");

  toggleBox.style.background = myGrey;
  toggleBox.textContent = "OFF";

  toggleBox.addEventListener("click", () => {
    toggleState = !toggleState;

    if (toggleState) {
      toggleBox.style.background = myOliveGreen.toString();
      toggleBox.textContent = "ON";
    } else {
      toggleBox.style.background = myGrey;
      toggleBox.textContent = "OFF";
    }

    client.publish("test/esp32/in", JSON.stringify({
      toggleState: toggleState
    }));
  });
}

// ------------------------------------------------------
// P5 DRAW LOOP
// ------------------------------------------------------
function draw() {
  clear();

  // Track
  noStroke();
  fill(myGrey);
  rect(73, trackTop, 10, trackBottom - trackTop);

  // Colours based on toggle
  let handleColor = toggleState ? myOliveGreen : myGrey;
  let valueColor = toggleState ? myOliveGreen : myGrey;

  // Handle
  stroke(0);
  strokeWeight(2);
  fill(handleColor);
  rect(43, handleY - handleHeight / 2, 68, handleHeight, 10);

  // Value text
  const valueBox = document.getElementById("value-display");
  valueBox.textContent = faderValue;
  valueBox.style.color = valueColor.toString();

  // Light confirm colour
  lightConfirm = faderValue;
  let myGrey2 = color(myGrey);
  let brightYellow = color(255, 255, 150);
  let confirmColor = lerpColor(myGrey2, brightYellow, lightConfirm / 100);

  const confirmBox = document.getElementById("lightConfirm-display");
  confirmBox.style.background = confirmColor.toString();

  // Dragging logic
  if (dragging) {
    let y = getPointerY();
    handleY = constrain(y, trackTop, trackBottom);
    faderValue = Math.round(map(handleY, trackBottom, trackTop, 0, 100));
    lightConfirm = faderValue;
  }
}

// ------------------------------------------------------
// INPUT HANDLERS
// ------------------------------------------------------
function mousePressed() {
  startDrag(mouseX, mouseY);
}

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
  if (
    x > 30 &&
    x < 125 &&
    y > handleY - handleHeight / 2 &&
    y < handleY + handleHeight / 2
  ) {
    dragging = true;
  }
  else if (x > 30 && x < 125 && y > trackTop && y < trackBottom) {
    dragging = true;
    handleY = y;
    faderValue = Math.round(map(handleY, trackBottom, trackTop, 0, 100));
  }
}

function getPointerY() {
  if (touches.length > 0) return touches[0].y;
  return mouseY;
}
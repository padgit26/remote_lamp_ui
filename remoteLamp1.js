console.log("remoteLamp1.js is running");


let faderValue = 50;
let handleY;
let trackTop = 83;
let trackBottom = 570;
let handleHeight = 40;
let dragging = false;
let myOliveGreen;
let myGrey;
let toggleState = false;   // false = OFF, true = ON
let lightConfirm = 0;

// -----------------------------------------
// MQTT CLIENT SETUP (PLACE THIS HERE)
// -----------------------------------------
const client = mqtt.connect("wss://h2818280.ala.asia-southeast1.emqxsl.com:8084/mqtt", {
  username: "paddiaddison2016@gmail.com",
  password: "emqPad!91065",
  clientId: "web-ui-" + Math.random().toString(16).substr(2, 8)
});

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("test/esp32/out");

   // Start heartbeat
  setInterval(() => {
    client.publish("test/esp32/in", JSON.stringify({ heartbeat: true }));
    flashHeartbeatLED();
  }, 2000);

});


client.on("message", (topic, payload) => {
  const text = payload.toString();
  console.log("RAW MQTT:", text);


  // Ignore non‑JSON messages so the handler doesn't crash
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

// This flashes the green led to show heartbeat from the esp32
function flashHeartbeatLED() {
  const led = document.getElementById("heartbeat-led");

  // Turn it ON
  led.style.background = "rgb(63, 255, 63)";

  // Turn it OFF after 120ms
  setTimeout(() => {
    led.style.background = "rgb(80, 80, 80)";  // or whatever your "off" colour is
  }, 150);
}



function setup() {
  let c = createCanvas(300, 650);
  myOliveGreen = color(65, 87, 27);
  myGrey = color(180,180,180);

  c.parent("sketch-container");

  // Prevent page scrolling while touching the canvas
  c.elt.addEventListener("touchstart", e => e.preventDefault(), { passive: false });
  c.elt.addEventListener("touchmove", e => e.preventDefault(), { passive: false });

  handleY = map(faderValue, 0, 100, trackBottom, trackTop);

  // -------------------------------
  // INITIALISE TOGGLE BUTTON HERE
  // -------------------------------
  const toggleBox = document.getElementById("toggleButton-display");

  // Set initial appearance
  toggleBox.style.background = myGrey;
  toggleBox.textContent = "OFF";

  // Click handler
  toggleBox.addEventListener("click", () => {
  toggleState = !toggleState;

  // Update UI appearance
  if (toggleState) {
    toggleBox.style.background = myOliveGreen.toString();
    toggleBox.textContent = "ON";
  } else {
    toggleBox.style.background = myGrey;
    toggleBox.textContent = "OFF";
  }

  // Publish toggle state to ESP32
  client.publish("test/esp32/in", JSON.stringify({
    toggleState: toggleState
  }));
});

}

function draw() {
  clear();

  // Track
  noStroke();
  fill(myGrey);
  rect(73, trackTop, 10, trackBottom - trackTop);

  // Choose colours based on toggle state
let handleColor = toggleState ? myOliveGreen : myGrey;
let valueColor  = toggleState ? myOliveGreen : myGrey;

// Handle
stroke(0);
strokeWeight(2);
fill(handleColor);
rect(43, handleY - handleHeight/2, 68, handleHeight, 10);

// Value (canvas colour)
fill(valueColor);
textSize(32);
textAlign(CENTER);

// Value (HTML text)
const valueBox = document.getElementById("value-display");
valueBox.textContent = faderValue;
valueBox.style.color = valueColor.toString();

// Mirror fader for now
lightConfirm = faderValue;

// Colours
let myGrey2 = color(myGrey);
let brightYellow = color(255, 255, 150);

// Smooth transition
let confirmColor = lerpColor(myGrey2, brightYellow, lightConfirm / 100);

// Update HTML box
const confirmBox = document.getElementById("lightConfirm-display");
confirmBox.style.background = confirmColor.toString();
/*confirmBox.textContent = lightConfirm;*/


  /* DEBUG: show handle hitbox
noFill();
stroke(255, 0, 0);     // bright red outline
strokeWeight(2);
rect(30, handleY - handleHeight/2, 95, handleHeight);*/


  if (dragging) {
    let y = getPointerY();
    handleY = constrain(y, trackTop, trackBottom);
    faderValue = Math.round(map(handleY, trackBottom, trackTop, 0, 100));
    lightConfirm = faderValue;

  }
}

function mousePressed() {
  startDrag(mouseX, mouseY);
}

function mouseReleased() {
  dragging = false;
  client.publish("test/esp32/in", JSON.stringify({
  faderValue: faderValue
}));

}

function touchStarted() {
  let t = touches[0];
  startDrag(t.x, t.y);
}

function touchEnded() {
  dragging = false;
  client.publish("test/esp32/in", JSON.stringify({
  faderValue: faderValue
}));

}

function startDrag(x, y) {
  // Handle hitbox
  if (
    x > 30 &&
    x < 125 &&
    y > handleY - handleHeight/2 &&
    y < handleY + handleHeight/2
  ) {
    dragging = true;
  }
  // Track click
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


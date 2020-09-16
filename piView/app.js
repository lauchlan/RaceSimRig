dragElement(document.getElementById("track"));

function dragElement(elmnt) {
  var pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

let hasStarted = false;

var c = document.getElementById("trackMap");
let ctx = c.getContext("2d");
ctx.strokeStyle = "red";

function drawPositions(positions, minXPosition, minYPosition, ctx) {
  //console.log("redrawing all");
  ctx.beginPath();
  ctx.moveTo(
    Math.floor(positions[0].position.x - minXPosition),
    Math.floor(positions[0].position.y - minYPosition)
  );

  let lastLap = 0;

  ctx.strokeStyle = "blue";
  positions.forEach((item) => {
    if (lastLap != item.lap) {
      ctx.stroke();
      ctx.beginPath();
      lastLap = item.lap;
      if (item.lap == 0) {
        ctx.strokeStyle = "red";
      } else if (item.lap == 1) {
        ctx.strokeStyle = "green";
      } else if (item.lap == 2) {
        ctx.strokeStyle = "yellow";
      } else if (item.lap == 3) {
        ctx.strokeStyle = "pink";
      } else if (item.lap == 4) {
        ctx.strokeStyle = "orange";
      }
    }

    ctx.lineTo(
      Math.floor(item.position.x - minXPosition),
      Math.floor(item.position.y - minYPosition)
    );
    console.log(
      "drew to",
      item.position.x - minXPosition,
      item.position.y - minYPosition
    );
  });
  ctx.stroke();
}

function WebSocketTest() {
  let maxXPosition = 0;
  let maxYPosition = 0;

  let minXPosition = Number.MAX_SAFE_INTEGER;
  let minYPosition = Number.MAX_SAFE_INTEGER;

  const positions = [];

  let lastTimeStamp = 0;

  if ("WebSocket" in window) {
    // Let us open a web socket
    var ws = new WebSocket("ws://localhost:8999/");

    ws.onopen = function () {
      console.log("Socket opened");
    };

    ws.onmessage = function (evt) {
      var data = JSON.parse(evt.data);

      if (data.time - lastTimeStamp >= 1000) {
        lastTimeStamp = data.time;
        data.position.x *= 1;
        data.position.y *= 1;

        data.position.x += data.position.y / 2;
        data.position.y += data.position.z / 4;

        if (data.isRaceOn) {
          positions.push({ lap: data.lap, position: data.position });

          if (
            data.position.y < minYPosition ||
            data.position.x < minXPosition
          ) {
            minXPosition = Math.min(minXPosition, data.position.x);
            minYPosition = Math.min(minYPosition, data.position.y);

            ctx.clearRect(0, 0, c.width, c.height);
            ctx = c.getContext("2d");
            drawPositions(positions, minXPosition, minYPosition, ctx);
          }
        }

        const adjustedX = Math.floor(data.position.x - minXPosition);
        const adjustedY = Math.floor(data.position.y - minYPosition);

        maxXPosition = Math.max(maxXPosition, adjustedX);
        maxYPosition = Math.max(maxYPosition, adjustedY);

        if (c.height < maxYPosition - minYPosition) {
          const newHeight = Math.round((maxYPosition - minYPosition) * 1.1);
          //console.log(`Increasing height from ${c.height} to ${newHeight}`);
          c.height = newHeight;
          ctx = c.getContext("2d");
          drawPositions(positions, minXPosition, minYPosition, ctx);
        }

        if (c.width < maxXPosition - minXPosition) {
          const newWidth = Math.round((maxXPosition - minXPosition) * 1.1);
          //console.log(`Increasing width from ${c.width} to ${newWidth}`);
          c.width = newWidth;
          ctx = c.getContext("2d");
          drawPositions(positions, minXPosition, minYPosition, ctx);
        }

        if (!hasStarted && data.isRaceOn) {
          hasStarted = true;
          //console.log("Race start, moving to ", adjustedX, adjustedY)
        }

        if (!data.isRaceOn) {
          hasStarted = false;
        } else {
          //console.log("line to ", adjustedX, adjustedY)
          //   ctx = c.getContext("2d");
          //   ctx.strokeStyle = "white";
          //   ctx.beginPath();
          //   ctx.rect(adjustedX, adjustedY, 1, 1);
          //   ctx.stroke();

          ctx.clearRect(0, 0, c.width, c.height);
          ctx = c.getContext("2d");
          drawPositions(positions, minXPosition, minYPosition, ctx);
        }
      }

      //console.log(data);
      document.getElementById("fanA").innerHTML =
        Math.round(data.fanA.percentageStrength) + "%";
      document.getElementById("fanB").innerHTML =
        Math.round(data.fanB.percentageStrength) + "%";
      document.getElementById("gear").innerHTML = data.gear;
      document.getElementById("speed").innerHTML = Math.round(
        data.currentSpeed * 2.23694
      );
      document.getElementById("rpm").innerHTML =
        Math.round(data.currentRpm) + "/" + Math.round(data.maxRpm);

      if (data.fanA.override) {
        document.getElementById("fanASelect").value =
          data.fanA.percentageStrength;
      } else {
        document.getElementById("fanASelect").value = 0;
      }

      if (data.fanB.override) {
        document.getElementById("fanBSelect").value =
          data.fanB.percentageStrength;
      } else {
        document.getElementById("fanBSelect").value = 0;
      }
    };

    ws.onclose = function () {
      // websocket is closed.
      console.log("socket closed");
      setTimeout(() => WebSocketTest(), 3000);
    };

    ws.onerror = function () {
      console.log("socket error");
      //setTimeout(() => WebSocketTest(), 3000);
    };
  } else {
    // The browser doesn't support WebSocket
    console.error("WebSocket NOT supported by your Browser!");
  }
}

function fanChange(fan, value) {
  if (value == 0) {
    value = -1;
  } else {
    value = Math.round((value / 100) * 255);
  }

  console.log(fan, value);
  fetch(`http://localhost:8080/fan/${fan}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ speed: value }),
  });
}
WebSocketTest();

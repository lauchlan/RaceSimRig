dragElement(document.getElementById("track"));
dragElement(document.getElementById("stats"));

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
  trace("redrawing all");

  ctx.clearRect(0, 0, c.width, c.height);
  ctx = c.getContext("2d");
  ctx.font = "30px Arial";
  ctx.beginPath();
  ctx.moveTo(
    Math.floor(positions[0].position.x - minXPosition),
    Math.floor(positions[0].position.y - minYPosition)
  );

  let lastLap = -1;

  positions.forEach((item) => {
    if (lastLap != item.lap) {
      ctx.stroke();
      ctx.beginPath();
      lastLap = item.lap;
      if (item.lap == 0) {
        ctx.strokeStyle = "red";
      } else if (item.lap == 1) {
        ctx.strokeStyle = "yellow";
      } else if (item.lap == 2) {
        ctx.strokeStyle = "pink";
      } else if (item.lap == 3) {
        ctx.strokeStyle = "green";
      } else if (item.lap == 4) {
        ctx.strokeStyle = "purple";
      }
    }

    ctx.lineTo(
      Math.floor(item.position.x - minXPosition),
      Math.floor(item.position.y - minYPosition)
    );
    trace(
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

  let positions = [];

  let lastTimeStamp = 0;

  let lastLapNumber = 100;

  if ("WebSocket" in window) {
    // Let us open a web socket
    var ws = new WebSocket("ws://localhost:8999/");

    ws.onopen = function () {
      console.log("Socket opened");
    };

    ws.onmessage = function (evt) {
      var data = JSON.parse(evt.data);

      if (data.type == "dash") {
        if (data.isRaceOn && data.lap < lastLapNumber) {
          trace("Resetting");
          c.width = 1;
          c.height = 1;
          positions = [];
          lastTimeStamp = 0;
          lastLapNumber = data.lap;
        } else if (data.isRaceOn) {
          lastLapNumber = data.lap;
        }

        if (data.time - lastTimeStamp >= 1000) {
          lastTimeStamp = data.time;

          // we plot x,z
          const x = Math.round(data.position.x); // + data.position.z / 2);
          const y = Math.round(data.position.z); // + data.position.z / 4);

          trace(
            `===========================\nProcessing Dash Message ${x}, ${y}`
          );

          if (data.isRaceOn) {
            positions.push({ lap: data.lap, position: { x, y } });

            if (y < minYPosition || x < minXPosition) {
              minXPosition = Math.min(minXPosition, x);
              minYPosition = Math.min(minYPosition, y);

              trace(`Recorded new mins ${minXPosition},${minYPosition}`);
            }
          }

          maxXPosition = Math.max(maxXPosition, x);
          maxYPosition = Math.max(maxYPosition, y);

          trace(`Recorded new max ${maxXPosition},${maxYPosition}`);

          const adjustedX = Math.floor(x - minXPosition);
          const adjustedY = Math.floor(y - minYPosition);

          const dataWidth = maxXPosition - minXPosition;
          const dataHeight = maxYPosition - minYPosition;

          trace(`Data size ${dataWidth},${dataHeight}`);

          if (c.height < dataHeight) {
            const newHeight = Math.round(dataHeight * 1.1);
            trace(`Increasing height from ${c.height} to ${newHeight}`);
            c.height = newHeight;
          }

          if (c.width < dataWidth) {
            const newWidth = Math.round(dataWidth * 1.1);
            trace(`Increasing width from ${c.width} to ${newWidth}`);
            c.width = newWidth;
          }

          trace(`Canvas size ${c.width},${c.height}`);

          if (!hasStarted && data.isRaceOn) {
            hasStarted = true;
          }

          if (!data.isRaceOn) {
            hasStarted = false;
          } else {
            drawPositions(positions, minXPosition, minYPosition, ctx);
          }
        }

        //trace(data);
        document.getElementById("fanA").innerHTML =
          Math.round(data.fanA.percentageStrength) + "%";
        document.getElementById("fanB").innerHTML =
          Math.round(data.fanB.percentageStrength) + "%";
        document.getElementById("gear").innerHTML = data.gear;
        document.getElementById("speed").innerHTML = Math.round(
          data.currentSpeed * 2.23694
        );
        document.getElementById("lap").innerHTML = `lap ${data.lap + 1}`;
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
      } else {
        renderChart(data.stats);
      }
    };

    ws.onclose = function () {
      console.log("socket closed");
      setTimeout(() => WebSocketTest(), 3000);
    };

    ws.onerror = function () {
      console.log("socket error");
    };
  } else {
    console.error("WebSocket NOT supported by your Browser!");
  }
}

function fanChange(fan, value) {
  if (value == 0) {
    value = -1;
  } else {
    value = Math.round((value / 100) * 255);
  }

  trace.log(fan, value);
  fetch(`http://localhost:8080/fan/${fan}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ speed: value }),
  });
}

let maxSpeedStat = 0;
let maxTorqueStat = 0;
let minSpeedStat = 10000;
let minTorqueStat = 10000;

function renderChart(stats) {
  if (!stats.torque) return;

  var c = document.getElementById("statsChart");
  let ctx = c.getContext("2d");
  ctx.strokeStyle = "red";

  ctx.clearRect(0, 0, c.width, c.height);

  console.log(stats.torque);
  const torqueStats = stats.torque.slice(1);

  torqueStats.forEach((torques, gear) => {
    torques.forEach((torque, speed) => {
      if (speed != null && torque != null) {
        maxSpeedStat = Math.max(maxSpeedStat, speed);
        maxTorqueStat = Math.max(maxTorqueStat, torque);
        minSpeedStat = Math.min(minSpeedStat, speed);
        minTorqueStat = Math.min(minTorqueStat, torque);
      }
    });
  });

  console.log(minTorqueStat, maxTorqueStat);

  ctx.strokeStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(0, c.height - 40);
  ctx.lineTo(c.width, c.height - 40);
  ctx.stroke();

  for (let i = minSpeedStat; i < maxSpeedStat; i += 10) {
    const x = ((i - minSpeedStat) / (maxSpeedStat - minSpeedStat)) * c.width;
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(x, c.height - 20);
    ctx.lineTo(x, c.height - 40);

    if ((i - minSpeedStat) % 20 == 0) {
      ctx.textAlign = "center";
      ctx.fillText("" + i, x, c.height);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#222222";
    ctx.moveTo(x, c.height - 40);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }

  ctx.stroke();

  torqueStats.forEach((torques, gear) => {
    if (gear == 0) {
      ctx.strokeStyle = "red";
    } else if (gear == 1) {
      ctx.strokeStyle = "yellow";
    } else if (gear == 2) {
      ctx.strokeStyle = "pink";
    } else if (gear == 3) {
      ctx.strokeStyle = "green";
    } else if (gear == 4) {
      ctx.strokeStyle = "purple";
    } else if (gear == 5) {
      ctx.strokeStyle = "orange";
    }
    ctx.moveTo(0, c.height - 60);
    ctx.beginPath();
    console.log("Drawing torque for gear ", gear, ctx.strokeStyle);

    torques.forEach((torque, speed) => {
      if (speed != null && torque != null) {
        ctx.lineTo(
          ((speed - minSpeedStat) / (maxSpeedStat - minSpeedStat)) * c.width,
          c.height -
            60 -
            ((torque - minTorqueStat) / (maxTorqueStat - minTorqueStat)) *
              (c.height - 90)
        );
      }
    });
    ctx.stroke();
  });
}

function trace(str) {
  //console.log(str);
}
WebSocketTest();

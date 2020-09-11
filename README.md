# RaceSimRig - Fan controller and datagram relay for CarDash data from Forza7

## Technologies used

- NodeJS
- Typescript
- NPM
- Adruino
- Vanilla js + material
- Chrome/Safari

## Overview

The server can be run on any device with node, I run it on a raspberry pi 3b. I have an arduino uno and motor shield connected to it, with 2x12W 120mm fans wired in.

On the pi you can run the html page in the 'piView' folder, it connects to a telemetry feed from the node server over a websocket. Fans can be overridden to a constant speed if desired, or just for testing. Set the sliders back to 0 to have the fans follow the speed of the car.

The server will also relay messages to another client, for example a dashboard application running on a tablet.

The server exposes rest apis to set the usb device and to manually control fans.

### Running stuff

In the server directory, copy `server.sample.properties` to `server.properties`

Run using

    npm run prod

View avilable ports by hitting <http://localhost:8080/ports>, which can also save your selection

#### Attribution

##### UDP code for reading dash messages inspired by Gabriel Barreto's [simple udp server](https://github.com/gsbarreto/simple-udp-server-fm7)

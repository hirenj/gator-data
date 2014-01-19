#!/usr/bin/env node-canvas
/*jslint indent: 2, node: true */
/*global Image: true */
"use strict";

var Canvas = require('./lib/canvas');
var Image = Canvas.Image;
var canvas = new Canvas();
var ctx = canvas.getContext('2d');
var fs = require('fs');

ctx.clearRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);


var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({port: 8080});
wss.on('connection', function(ws) {
    console.log("We got a new connection");
    ws.on('message', function(message) {
        message = JSON.parse(message);
        if (message.image) {
            ctx.fillStyle = 'white';
            ctx.fillRect(200, 0, 1500, canvas.height);


            var base64 = message.image.replace(/.*,/,'');
            var imageObj = new Image();
        
            var indata = new Buffer(base64,'base64');

            imageObj.src= indata;
            var out_width = imageObj.width;
            var out_height = imageObj.height;
            var scale = 1500 / out_width;
            out_height = out_height * scale;
            ctx.drawImage(imageObj,200,200,1500,out_height );
            canvas.vgSwapBuffers();
        }
    });
});

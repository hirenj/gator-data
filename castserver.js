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
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'black';
    ctx.fillRect(0,0, canvas.width, canvas.height);
    canvas.vgSwapBuffers();
    ctx.globalAlpha = 1;

    ws.on('close', function() { 
        ctx.clearRect(0,0,canvas.width,canvas.height);
        canvas.vgSwapBuffers();
    });


    ws.on('message', function(message) {
        message = JSON.parse(message);
        if (message.image) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            roundRect(ctx,200,150,1500,canvas.height-300,50,true,false);


            var base64 = message.image.replace(/.*,/,'');
            var imageObj = new Image();
        
            var indata = new Buffer(base64,'base64');

            imageObj.src= indata;
            var out_width = imageObj.width;
            var out_height = imageObj.height;
            var scale = 1500 / out_width;
            out_height = 10 + out_height * scale;
            var top = 150+0.5*(canvas.height-300-out_height); 
            ctx.drawImage(imageObj,200,top,1500-10,out_height );
            canvas.vgSwapBuffers();
        }
    });
});

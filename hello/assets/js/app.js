// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import css from "../css/app.css"

// webpack automatically bundles all modules in your
// entry points. Those entry points can be configured
// in "webpack.config.js".
//
// Import dependencies
//
import "phoenix_html"

// Import local files
//
// Local files can be imported directly using relative paths, for example:
import socket from "./socket"
import Codemirror from "../../priv/static/js/codemirror"

let channel = socket.channel("room:lobby", {});

channel.on('shout', function (payload) {
    console.log(payload.user_id, my_id)
    if(payload.user_id != my_id){
        cm.replaceRange(payload.changeObj.text, {line: payload.changeObj.from.line, ch: payload.changeObj.from.ch}, {line: payload.changeObj.to.line, ch: payload.changeObj.to.ch});
    }
    // marker.clear();
    // marker = cm.setBookmark(cm.getCursor(), { widget: cursorElement });
});

channel.on("updateCursor", function(payload) {
    if(my_id != payload.user_id){
        // console.log("received update");
        console.log(payload);
        // marker.clear();
        // marker = cm.setBookmark(payload.cursorPos, { widget: cursorElement });
        var cursor = document.createElement('span');
        cursor.style.borderLeftStyle = 'solid';
        cursor.style.borderLeftWidth = '1px';
        cursor.style.height = `${(payload.cursorPos.bottom - payload.cursorPos.top)}px`;
        cursor.style.padding = 0;
        cursor.style.zIndex = 0;
        cursor.style.borderLeftColor = '#' + payload.user_id.toString(16);
        if(markers[payload.user_id] != undefined){
            markers[payload.user_id].clear();
        }
        markers[payload.user_id] = cm.setBookmark(payload.cursorPos, {widget: cursor});
    }
})

channel.on("createCursor", function(payload) {
    // const cursorCoords = cm.cursorCoords(cm.getCursor());
    if(my_id != payload.user_id){
        const cursorCoords = {ch: 0, line:0};
        var cursorElement = document.createElement('span');
        cursorElement.style.borderLeftStyle = 'solid';
        cursorElement.style.borderLeftWidth = '1px';
        cursorElement.style.borderLeftColor = '#' + payload.user_id.toString(16);
        // cursorElement.style.borderLeftColor = '0xff0000'
        console.log('#' + payload.user_id.toString(16))
        cursorElement.style.height = `${(cursorCoords.bottom - cursorCoords.top)}px`;
        cursorElement.style.padding = 0;
        cursorElement.style.zIndex = 0;
        // myMarker = cm.setBookmark(cursorCoords, {widget: cursorElement});
        markers[payload.user_id] = cm.setBookmark(cursorCoords, {widget: cursorElement});
        // console.log("payload:")
        // console.log(payload)
        // console.log("myMarker:")
        // console.log(myMarker);
    }
})

channel.join()
console.log(channel)

var cm = Codemirror.fromTextArea(document.getElementById("editor"), {
    mode: "python",
    theme: "darcula",
    lineNumbers: true,
    autoCloseTags: true
});

    // const cursorCoords = cm.cursorCoords(cm.getCursor());
    // const cursorElement = document.createElement('span');
    // cursorElement.style.borderLeftStyle = 'solid';
    // cursorElement.style.borderLeftWidth = '2px';
    // cursorElement.style.borderLeftColor = '#ff0000';
    // cursorElement.style.height = `${(cursorCoords.bottom - cursorCoords.top)}px`;
    // cursorElement.style.padding = 0;
    // cursorElement.style.zIndex = 0;
    // var marker = cm.setBookmark(cm.getCursor(), { widget: cursorElement });

    // const cursorCoords1 = cm.cursorCoords(cm.getCursor());
    // const cursorElement1 = document.createElement('span');
    // cursorElement1.style.borderLeftStyle = 'solid';
    // cursorElement1.style.borderLeftWidth = '2px';
    // cursorElement1.style.borderLeftColor = '#00ff00';
    // cursorElement1.style.height = `${(cursorCoords.bottom - cursorCoords.top)}px`;
    // cursorElement1.style.padding = 0;
    // cursorElement1.style.zIndex = 0;
    // var marker1 = cm.setBookmark(cm.getCursor(), { widget: cursorElement1 });

var markers = {};
// const my_user_id;
var reply;
var my_id;
channel.push("get_my_id", {}).receive(
    "ok", (reply) => my_id = reply.user_id
)
channel.push("createCursor", {})



cm.on("beforeChange", (cm, changeObj) => {
    // console.log(cm.getCursor());
    // console.log(socket.id); 
    // marker.clear();
    
    // console.log("before changing");
    if(changeObj.origin != undefined){
        // changeObj.cancel();
        channel.push('shout', {
            changeObj: changeObj
        });
    }
})

cm.on("cursorActivity", (cm) => {
    var cursorPos = cm.getCursor();
    console.log(cursorPos);
    // console.log(window.user_id)
    // console.log(marker);
    // console.log(marker.find());
    channel.push("updateCursor", {
        cursorPos: cursorPos,
    });
});

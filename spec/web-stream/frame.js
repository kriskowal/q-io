
var Q = require("q");
var WindowStream = require("../../window-stream");

var stream = WindowStream.connect(window, "jabber")
console.log("FRAME");
stream.forEach(function (message) {
    console.log("FRAME receives", message);
})
.then(function () {
    console.log("FRAME closes");
})
.done();
stream.yield(10);
stream.yield(20);
stream.yield(30);
stream.return(0);

Q.delay(500)
.then(function () {
    var stream = WindowStream.connect(window, "jabber")
    console.log("FRAME");
    stream.forEach(function (message) {
        console.log("FRAME receives", message);
    }).then(function () {
        console.log("FRAME closes");
    }).done();
    stream.yield(10);
    stream.yield(20);
    stream.yield(30);
    stream.return(0);
})
.done();


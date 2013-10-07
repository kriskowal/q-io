
var WindowStream = require("../../window-stream");
var frame = document.getElementsByTagName("iframe")[0];

console.log("HOST");
var connections = WindowStream.listen(frame.contentWindow, "jabber");

connections.forEach(function (stream, index) {
    stream.forEach(function (message) {
        console.log("HOST receives", message);
    }).then(function () {
        console.log("HOST closes");
    }).done();
    stream.yield(10);
    stream.yield(20);
    stream.yield(30);
    stream.return(0);
    if (index === 2) {
        connections.close();
    }
});


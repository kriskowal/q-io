
// Two years after @johnjbarton sends me the code for this, I got around to
// integrating it.  Belated and apologetic thanks.
// https://github.com/kriskowal/q-connection/pull/8

var Q = require("q");
var WebStream = require("./web-stream");
var BufferStream = require("./buffer-stream");

exports.listen = listen;
function listen(frame, station, connect) {
    var input = new BufferStream();
    var output = new BufferStream();
    var buffer = new BufferStream({get: output.get, put: input.put});

    function onmessage(event) {
        var data = event.data;
        if (typeof data !== "object") {
            return;
        }
        if (data.station !== station) {
            return;
        }
        if (data.type === "q-io-client-ready") {
            var channel = new MessageChannel();
            frame.postMessage({type: "q-io-connect", station: station}, window.location.origin, [channel.port1]);
            output["yield"](WebStream(channel.port2));
        }
    }

    frame.addEventListener("message", onmessage, false);
    frame.postMessage({type: "q-io-host-ready", station: station}, window.location.origin);

    input.forEach(function () {
        // ignored
    })
    .then(function () {
        frame.removeEventListener("message", onmessage, false);
    });

    return buffer;
}

exports.connect = connect;
function connect(frame, station) {
    var input = new BufferStream();
    var output = new BufferStream();
    var buffer = new BufferStream({
        get: input.get.bind(input),
        put: output.put.bind(output)
    });

    function onmessage(event) {
        var data = event.data;
        if (typeof data !== "object") {
            return;
        }
        if (data.station !== station) {
            return;
        }
        if (data.type === "q-io-host-ready") {
            frame.postMessage({type: "q-io-client-ready", station: station}, window.location.origin);
        } else if (data.type === "q-io-connect") {
            var stream = WebStream(event.ports[0]);
            stream.copy(input).done();
            output.copy(stream).done();
            window.removeEventListener("message", onmessage, false);
        }
    }

    frame.addEventListener("message", onmessage, false);
    frame.postMessage({type: "q-io-client-ready", station: station}, window.location.origin);

    return buffer;
}


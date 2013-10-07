
var Q = require("q");
var BufferStream = require("./buffer-stream");

// WebWorker {postMessage(message), onmessage, addEventListener}
// WebSocket {send(message), close(code, reason), onmessage, onopen, onclose,
//  onerror, readyState, addEventListener}
// MessageChannel or Window MessagePort {postMessage(message), onmessage,
//  addEventListener, start}
// BufferStreams {get, put}

// does not adapt socket.io, Node.js event emitters, or Window message ports.
// These require another layer.  socket.io needs a message type to demultiplex.
// Window message ports also need to be demultiplexed, preferably by
// transferring a message port.  If a Window port is a sole communication
// channel, it would need to be wrapped to pass the proper origin anyway.

module.exports = Connection;
function Connection(port) {
    var buffer = new BufferStream();
    var put, get;

    // sender side:
    if (port.postMessage) {
        // MessagePort
        put = function (iteration) {
            // for future reference:
            // if this is a window, postMessage(message, origin, transfer)
            // if this is a message port, postMessage(message, transfer)
            // - via @johnjbarton
            port.postMessage(iteration);
            // TODO port.close();
        };
    } else if (port.send) {
        // WebSocket
        // has a send method, which can not be used until the socket is open,
        // so we'll send messages to a promise instead
        var putDeferred = Q.defer();
        put = function (iteration) {
            putDeferred.promise.fcall(iteration);
        };
        port.addEventListener("open", function () {
            put = function (iteration) {
                port.send(iteration);
            };
            putDeferred.resolve(put);
        });
        port.addEventListener("close", function () {
            putDeferred.reject(new Error("Can't send to socket that failed to open"));
            buffer["return"]();
        });
        port.addEventListener("error", function (event) {
            putDeferred.reject(event);
            buffer["throw"](event);
        });
    } else if (port.put) {
        put = function (iteration) {
            return buffer.put(iteration);
        };
    } else {
        throw new Error("Can't adapt port to a promise stream " + port);
    }

    // receiver side
    if (port.onmessage !== undefined && port.addEventListener) {
        port.addEventListener("message", function (event) {
            buffer.put(event.data);
            // TODO port.close();
        }, false);
        get = function () {
            return buffer.get();
        };
    } else if (port.get) {
        get = function () {
            return port.get();
        };
    } else {
        throw new Error("Can't adopt port to a promise stream " + port);
    }

    // Message ports have a start method; call it to make sure that messages
    // get sent.
    if (port.start) {
        port.start();
    }

    return new BufferStream({
        get: function () {
            return get();
        },
        put: function (iteration) {
            return put(iteration);
        }
    });

}


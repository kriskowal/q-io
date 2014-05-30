
var Q = require("q");

var Queue = require("q/queue");
var BufferStream = require("../buffer-stream");

var version = process.versions.node.split('.');
var supportsReadable = version[0] >= 0 && version[1] >= 10;

module.exports = Reader;
function Reader(_stream, charset, length) {
    if (charset && _stream.setEncoding) // TODO complain about inconsistency
        _stream.setEncoding(charset);

    var window = 0;
    var index = 0;
    var drained = true;
    var queue = new Queue();
    var output = new BufferStream({
        get: function () {
            window++;
            if (window > 0) {
                flush();
            }
            return queue.get();
        },
        put: queue.put
    });

    // this triggers a switch in `read`
    output.charset = charset;
    // also used in `read` for progress estimates
    output.length = length;

    _stream.on("error", function (error) {
        output.throw(error);
    });

    _stream.on("end", function () {
        output.return();
    });

    _stream.on("readable", function () {
        drained = false;
        flush();
    });

    function flush() {
        if (window > 0 && !drained) {
            var chunk = _stream.read();
            if (chunk === null) {
                drained = true;
                return;
            }
            window--;
            output.yield(chunk, index);
            index += chunk.length;
        }
    }

    return output;
}


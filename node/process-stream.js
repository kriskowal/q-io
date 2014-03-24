
var BufferStream = require("../buffer-stream");

module.exports = ProcessStream;
function ProcessStream(process) {
    var input = new BufferStream();
    var output = new BufferStream();
    var stream = new BufferStream({get: input.get, put: output.put});

    process.on("message", function (message) {
        input.yield(message);
    });

    process.on("close", function () {
        input.return(0);
    });

    process.on("exit", function (code) {
        input.return(code);
    });

    output.forEach(function (message) {
        process.send(message);
    });

    return stream;
}


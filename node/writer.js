
var Q = require("q");

/**
 * Wraps a Node writable stream, providing an API similar to
 * Narwhal's synchronous `io` streams, except returning and
 * accepting promises for long-latency operations.
 *
 * @param stream any Node writable stream
 * @returns {Promise * Writer} a promise for the
 * text writer.
 */
module.exports = Writer;

var version = process.versions.node.split('.');
var supportsFinish = version[0] >= 0 && version[1] >= 10;

function Writer(_stream, charset) {
    var self = Object.create(Writer.prototype);

    self.charset = charset;

    if (charset && _stream.setEncoding) // TODO complain about inconsistency
        _stream.setEncoding(charset);

    var drained = Q.defer();
    var finished = Q.defer();

    _stream.on("error", function (reason) {
        drained.reject(reason);
        finished.reject(reason);
        drained = Q.defer();
    });

    _stream.on("drain", function () {
        drained.resolve();
        drained = Q.defer();
    });

    _stream.on("finish", function () {
        finished.resolve();
    });

    /***
     * Writes content to the stream.
     * @param {String} content
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the buffer is empty, meaning
     * that all of the content has been sent.
     */
    // TODO consider removing support for "write"
    self.write = self.yield = function (content) {
        if (!_stream.writeable && !_stream.writable)
            return Q.reject(new Error("Can't write to non-writable (possibly closed) stream"));
        if (typeof content !== "string") {
            content = new Buffer(content);
        }
        if (!_stream.write(content)) {
            return drained.promise;
        } else {
            return Q();
        }
    };

    /***
     * Waits for all data to flush on the stream.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the buffer is empty
     */
    self.flush = function () {
        return drained.promise;
    };

    /***
     * Closes the stream, waiting for the internal buffer
     * to flush.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the stream has finished writing,
     * flushing, and closed.
     */
    // TODO consider removing support for "close"
    self.close = self.return = function () {

        if (!supportsFinish) { // new Streams, listen for `finish` event
            finished.resolve();
        }

        _stream.end();
        drained.resolve(); // we will get no further drain events
        return finished.promise;
    };

    /***
     * Terminates writing on a stream, closing before
     * the internal buffer drains.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the stream has finished closing.
     */
    self.destroy = // TODO remove support for destroy. Use cancel.
    self.cancel = self.throw = function () {
        _stream.destroy();
        drained.resolve(); // we will get no further drain events
        return Q(); // destruction not explicitly observable
    };

    self.node = _stream;

    return self;
}


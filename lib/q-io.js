
/**
 * Q Promise IO streams for Node
 * @module
 */

var FS = require("fs"); // node
var SYS = require("sys"); // node
var Q = require("q"); // q package
var consolidate = require("./q-io/buffer-io").consolidate;

/*whatsupdoc*/

/**
 * Wraps a Node readable stream, providing an API similar
 * to a Narwhal synchronous `io` stream except returning
 * Q promises for long latency operations.
 * @param stream any Node readable stream
 * @returns {Promise * Reader} a promise for
 * the text stream reader.
 * @constructor
 */
exports.Reader = function (_stream, charset) {
    var self = Object.create(exports.Reader.prototype);

    if (charset && _stream.setEncoding) // TODO complain about inconsistency
        _stream.setEncoding(charset);

    var begin = Q.defer();
    var end = Q.defer();

    // prevent indefinite buffering; resume on demand
    //_stream.pause();

    _stream.on("error", function (reason) {
        begin.reject(reason);
    });

    var chunks = [];
    var receiver;

    _stream.on("end", function () {
        begin.resolve(self); 
        end.resolve()
    });

    _stream.on("data", function (chunk) {
        begin.resolve(self); 
        if (receiver)
            receiver(chunk);
        else
            chunks.push(chunk);
    });

    function slurp() {
        if (charset) {
            var result = chunks.join("");
            chunks = [];
            return result;
        } else {
            consolidate(chunks);
            return chunks.shift();
        }
    }

    /*** 
     * Reads all of the remaining data from the stream.
     * @returns {Promise * String} a promise for a String
     * containing the entirety the remaining stream.
     */
    self.read = function () {
        receiver = undefined;
        //_stream.resume();
        var deferred = Q.defer();
        Q.when(end.promise, function () {
            deferred.resolve(slurp());
        });
        return deferred.promise;
    };

    /***
     * Reads and writes all of the remaining data from the
     * stream in chunks.
     * @param {Function(Promise * String)} write a function
     * to be called on each chunk of input from this stream.
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the input is depleted.
     */
    self.forEach = function (write) {
        //_stream.resume();
        if (chunks && chunks.length)
            write(slurp());
        receiver = write;
        return Q.when(end.promise, function () {
            receiver = undefined;
        });
    };

    return begin.promise;
};

/**
 * Wraps a Node writable stream, providing an API similar to
 * Narwhal's synchronous `io` streams, except returning and
 * accepting promises for long-latency operations.
 *
 * @param stream any Node writable stream
 * @returns {Promise * Writer} a promise for the
 * text writer.
 */
exports.Writer = function (_stream, charset) {
    var self = Object.create(exports.Writer.prototype);

    if (charset && _stream.setEncoding) // TODO complain about inconsistency
        _stream.setEncoding(charset);

    var begin = Q.defer();
    var end = Q.defer();
    var drained = Q.defer();

    _stream.on("error", function (reason) {
        begin.reject(reason);
    });

    _stream.on("drain", function () {
        begin.resolve(self);
        drained.resolve();
        drained = Q.defer();
    });

    _stream.on("end", function () {
        begin.resolve(self); 
        end.resolve()
    });

    /***
     * Writes content to the stream.
     * @param {String} content
     * @returns {Promise * Undefined} a promise that will 
     * be resolved when the buffer is empty, meaning
     * that all of the content has been sent.
     */
    self.write = function (content) {
        if (!_stream.writeable)
            return Q.reject(_stream.writeable);
        if (!_stream.write(content)) {
            return drained;
        }
    };

    /***
     * Waits for all data to flush on the stream.
     *
     * @returns {Promise * Undefined} a promise that will 
     * be resolved when the buffer is empty
     */
    self.flush = function () {
        return drained;
    };

    /***
     * Closes the stream, waiting for the internal buffer
     * to flush.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the stream has finished writing,
     * flushing, and closed.
     */
    self.close = function () {
        _stream.end();
        return end;
    };

    /***
     * Terminates writing on a stream, closing before
     * the internal buffer drains.
     *
     * @returns {Promise * Undefined} a promise that will
     * be resolved when the stream has finished closing.
     */
    self.destroy = function () {
        _stream.destroy();
        return end;
    };

    return self; // todo returns the begin.promise
};


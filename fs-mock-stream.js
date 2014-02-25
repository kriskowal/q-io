
var Q = require("q");
var BufferStream = require("./buffer-stream");

module.exports = MockStream;
function MockStream(chunks, charset) {
    this._closed = false;
    this._chunks = chunks;
    this._readBuffer = new BufferStream();
    chunks.forEach(function (chunk) {
        this._readBuffer.yield(chunk);
    }, this);
    this.charset = charset;
}

MockStream.prototype = Object.create(BufferStream.prototype);

MockStream.prototype.constructor = MockStream;

MockStream.prototype.next = function () {
    return this._readBuffer.next();
};

MockStream.prototype.yield = function (chunk) {
    if (this.charset) {
        chunk = new Buffer(chunk, this.charset);
    }
    this._chunks.push(chunk);
    this._readBuffer.yield(chunk);
    return Q();
};

MockStream.prototype.return = function (value) {
    this._closed = true;
    this._readBuffer.return(value);
    return Q();
};

MockStream.prototype.throw = function (error) {
    this._closed = true;
    this._readBuffer.throw(error);
    return Q();
};

MockStream.prototype.truncate = function () {
    this._chunks.splice(0, this._chunks.length);
    this._readBuffer = new BufferStream();
    return Q();
};

MockStream.prototype.write = BufferStream.prototype.write;
MockStream.prototype.close = BufferStream.prototype.close;
MockStream.prototype.destroy = BufferStream.prototype.destroy;


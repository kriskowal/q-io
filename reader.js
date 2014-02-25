
var Q = require("q");
var Iterator = require("collections/iterator");
var Readable = require("./streams").Readable;
var BufferStream = require("./streams").BufferStream;

module.exports = Reader;
function Reader(input, charset) {
    if (!(this instanceof Reader)) {
        return new Reader(input, charset);
    }
    this.iteratorPromise = Q(input).iterate()
    .catch(function (error) {
        if (input.forEach) {
            var buffer = new BufferStream();
            input.forEach(function (value, index) {
                buffer.yield(value, index);
            });
            return buffer;
        } else {
            error.message += " and is not forEachable";
        }
        throw error;
    });
    this.charset = charset;
}

Reader.prototype = Object.create(Readable.prototype);

Reader.prototype.constructor = Reader;

Reader.prototype.next = function () {
    return this.iteratorPromise.invoke("next");
};


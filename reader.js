"use strict";

var Q = require("q");
var Iterator = require("collections/iterator");
var Readable = require("./streams").Readable;
var BufferStream = require("./streams").BufferStream;

module.exports = Reader;
function Reader(source, charset) {
    if (!(this instanceof Reader)) {
        return new Reader(source, charset);
    }
    this.iteratorPromise = Q(source).iterate()
    .catch(function (cause) {
        if (source.forEach) {
            var buffer = new BufferStream();
            buffer.return(source.forEach(function (value, index) {
                buffer.yield(value, index);
            }));
            return buffer;
        } else {
            var error = new Error("Can't iterate because source is not forEachable and because " + cause.message);
            error.notIterable = true;
            error.notForEachable = true;
            throw error;
        }
    });
    this.source = source;
    this.charset = charset;
}

Reader.prototype = Object.create(Readable.prototype);

Reader.prototype.constructor = Reader;

Reader.prototype.next = function () {
    return this.iteratorPromise.invoke("next");
};


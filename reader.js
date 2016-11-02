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
    if (source.forEach) {
        var buffer = new BufferStream();
        Q(source.forEach(function (value, index) {
            return buffer.yield(value, index);
        })).then(function (value) {
            return buffer.return(value);
        }, function (error) {
            return buffer.throw(error);
        });
        return buffer;
    }
    this.iteratorPromise = Q(source).iterate();
    this.source = source;
    this.charset = charset;
}

Reader.prototype = Object.create(Readable.prototype);

Reader.prototype.constructor = Reader;

Reader.prototype.next = function () {
    return this.iteratorPromise.invoke("next");
};



var Q = require("q");
var Readable = require("./streams").Readable;

module.exports = Reader;
function Reader(input, charset) {
    if (!(this instanceof Reader)) {
        return new Reader(input, charset);
    }
    this.iteratorPromise = iterate(input);
    this.charset = charset;
}

Reader.prototype = Object.create(Readable.prototype);

Reader.prototype.constructor = Reader;

Reader.prototype.next = function () {
    return this.iteratorPromise.invoke("next");
};

function iterate(input) {
    if (Array.isArray(input)) {
        return Q(iterateArray(input));
    } else if (input.next) {
        return Q(input);
    } else {
        return Q(input).invoke("iterate");
    }
}

function iterateArray(values) {
    var index = 0;
    function next() {
        while (index < values.length && !(index in values)) {
            index++;
        }
        if (index < values.length) {
            return {value: values[index], index: index++};
        } else {
            return {done: true};
        }
    }
    return {next: next};
}


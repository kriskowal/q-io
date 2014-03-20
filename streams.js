
// TODO Writable, with support for buffer
// TODO WritableBuffer (that copies to a given writer)
// TODO consider pipe instead of copy
// TODO look into distinction between pipeTo and pipeThrough

var Q = require("q");
var Queue = require("q/queue");
var makeSemaphore = require("./semaphore");

// Readable must implement `next`
exports.Readable = Readable;
function Readable() {
}

Readable.prototype.forEach = function (callback, thisp, maxInFlight, notify) {
    var self = this;

    if (maxInFlight === void 0) {
        maxInFlight = 1;
    }

    // initialize the semaphore
    var semaphore = makeSemaphore(maxInFlight);
    var inFlight = 0;

    var deferred = Q.defer();

    if (notify) {
        notify = Q(notify);
    }

    function next() {
        var got = semaphore.get();
        got.then(function () {
            return self.next()
            .then(function (iteration) {
                if (notify) {
                    notify.call(void 0, ++inFlight, maxInFlight).done();
                }
                if (iteration.done) {
                    deferred.resolve(iteration.value);
                } else {
                    next();
                    return Q(iteration.value)
                    .then(function (value) {
                        return callback.call(thisp, value, iteration.index);
                    })
                    .then(function () {
                        if (notify) {
                            notify.call(void 0, --inFlight, maxInFlight).done();
                        }
                        semaphore.put();
                    });
                }
            });
        })
        .catch(deferred.reject);
    }

    next();

    return deferred.promise;
};

Readable.prototype.map = function (callback, thisp, maxInFlight, notify) {
    callback = Q(callback);
    var inFlight = 0;
    var done = false;
    var pipe = new Pipe(this, maxInFlight, notify);
    pipe.input.reduce(function (undefined, value, index) {
        inFlight++;
        callback.call(thisp, value)
        .then(function (value) {
            inFlight--;
            pipe.output.yield(value, index);
            if (done && inFlight === 0) {
                pipe.output.return();
            }
        })
        .then(null, function (error) {
            pipe.output.throw(error);
        });
    }, void 0)
    .then(function () {
        done = true;
        if (inFlight === 0) {
            pipe.output.return();
        }
    });
    return pipe.output;
};

Readable.prototype.reduce = function (callback, basis, maxInFlight, notify) {
    callback = Q(callback);
    var self = this;
    var inFlight = 0;
    var done = false;
    var deferred = Q.defer();

    // fulfilled bases, ready for aggregation
    var bases = new Queue();
    var semaphore = makeSemaphore(maxInFlight);

    if (notify) {
        notify = Q(notify);
    }

    var needsBasis;
    if (arguments.length < 2) {
        needsBasis = true;
    } else {
        Q(basis).then(bases.put);
        needsBasis = false;
    }

    function next() {
        return semaphore.get()
        .then(function () {
            return self.next();
        })
        .then(function (iteration) {
            if (iteration.done) {
                done = true;
                check();
            } else if (needsBasis) {
                Q(iteration.value)
                    .then(function (value) {
                        bases.put(value);
                        semaphore.put();
                    })
                    .then(null, deferred.reject);
                needsBasis = false;
                next();
            } else {
                ++inFlight;
                if (notify) {
                    notify.call(void 0, inFlight, maxInFlight).done();
                }
                next();
                return Q(iteration.value)
                .then(function (value) {
                    bases.get().then(function (basis) {
                        callback.call(void 0, basis, value, iteration.index)
                        .then(function (value) {
                            bases.put(value);
                            semaphore.put();
                        })
                        .then(null, deferred.reject);
                        --inFlight;
                        if (notify) {
                            notify.call(void 0, inFlight, maxInFlight).done();
                        }
                        check();
                    })
                    .then(null, deferred.reject);
                });
            }
        })
        .then(null, deferred.reject);
    }

    function check() {
        if (inFlight === 0 && done) {
            if (needsBasis) {
                deferred.reject(new Error("Can't reduce empty source without a basis"));
            } else {
                deferred.resolve(bases.get());
            }
        }
    }

    next();

    return deferred.promise;
};

Readable.prototype.buffer = function (maxInFlight, notify) {
    var pipe = new Pipe(this, maxInFlight, notify);
    function next() {
        return pipe.input.next()
        .then(function (iteration) {
            next();
            pipe.output.put(iteration);
        })
        .then(null, function (error) {
            pipe.output.throw(error);
        });
    }
    next();
    return pipe.output;
};

Readable.prototype.all = function (maxInFlight, notify) {
    var output = [];
    return this.reduce(function (undefined, value, index) {
        output[index] = value;
    }, void 0, maxInFlight, notify)
    .then(function () {
        return output;
    });
};

/**
 */
Readable.prototype.copy = function (output) {
    return this.forEach(function (chunk) {
        return output.yield(chunk);
    })
    .then(function () {
        return output.return();
    });
};

/*
 * Reads an entire forEachable stream of buffers and returns a single buffer.
 */
Readable.prototype.read = // TODO consider one or the other
Readable.prototype.join = function (delimiter) {
    var chunks = [];
    var self = this;
    return this.forEach(function (chunk) {
        chunks.push(chunk);
    })
    .then(function () {
        if (self.charset) {
            return chunks.join(delimiter || "");
        } else {
            return join(chunks, delimiter);
        }
    });
}

exports.join = join;
function join(buffers, delimiter) {
    if (delimiter !== void 0) {
        delimiter = Buffer(delimiter);
    } else if (!delimiter) {
        delimiter = void 0;
    }
    var length = 0;
    var at;
    var i;
    var ii = buffers.length;
    var buffer;
    var result;
    for (i = 0; i < ii; i++) {
        buffer = buffers[i];
        length += buffer.length;
        if (delimiter && i !== 0) {
            length += delimiter.length;
        }
    }
    result = new Buffer(length);
    at = 0;
    for (i = 0; i < ii; i++) {
        buffer = buffers[i];
        buffer.copy(result, at, 0);
        at += buffer.length;
        if (delimiter && i !== 0) {
            buffer.copy(delimiter, at, 0);
            at += delimiter.length;
        }
    }
    buffers.splice(0, ii, result);
    return result;
}

Readable.prototype.cancel = function () {
};

Readable.prototype.done = function () {
    this.forEach(noop).done();
};

function noop() {}

// ------------------------------------------------------------------------

/**
 * A Buffer is a thin wrapper around an indefinite promise `Queue`, which uses
 * a queue as an asynchronous transport for “iterations”.  If you have an
 * iterator, `next` returns iterations.  An asynchronous iterator returns
 * promises for iterations.  Buffers have the Queue interface (`get` and `put`
 * promises for iterations), but also support the asynchronous iterator
 * interface (`next` provides a promise for an iteration), and an interface
 * that allows you to pupeteer the iterator as if it were a generator (`yield`,
 * `throw`, and `return` methods).
 *
 * Buffer inherits the methods of `Readable`.
 */
exports.BufferStream = BufferStream;
function BufferStream(queue) {
    if (!(this instanceof BufferStream)) {
        return new BufferStream();
    }
    this.index = 0;
    var queue = queue || new Queue();
    var acks = new Queue();
    var self = this;
    this.get = function () {
        acks.put();
        return queue.get();
    };
    this.put = function (iteration) {
        queue.put(iteration);
        return acks.get();
    };
}

BufferStream.prototype = Object.create(Readable.prototype);

BufferStream.prototype.constructor = BufferStream;

/**
 * Get a promise for the next iteration.
 */
BufferStream.prototype.get = null;

/**
 * Put an iteration on the queue, or a promise for an iteration.
 */
BufferStream.prototype.put = null;

/**
 * Returns a promise for the next iteration.  Iterations are objects like
 * `{value}` for an iteration, which can be supplemented with an index like
 * `{value, index}` if the source is an array or array-like, and `{value, done:
 * true}` for the completion of the iteration, optionally with a return value,
 * or a rejected promise if the simulated generator threw an error.
 * @returns {Iteration*}
 */
BufferStream.prototype.next = function () {
    return this.get();
};

/**
 * Adds a value to the queue of iterations.  The value may be at an optional
 * given index.  If no index is provided, the iteration will be given a
 * sequence number.
 * @param {Any} value
 * @param {Number?} index
 */
BufferStream.prototype.yield = function (value, index) {
    if (index === undefined) {
        index = this.index++;
    }
    return this.put(new Iteration(value, false, index));
};

/**
 * Adds a completion value to the queue of iterations.  This signals the end of
 * the sequence, like closing a stream.
 */
BufferStream.prototype.return = function (value) {
    return this.put(new Iteration(value, true));
};

/**
 * Adds a thrown exception to the queue.  This signals the end of the sequence,
 * like closing a stream with an error, or throwing an exception from a
 * generator.
 */
BufferStream.prototype.throw = function (error) {
    this.put(Q.reject(error));
};

// TODO consider removing the write/close/destroy interface entirely
BufferStream.prototype.write = function (value) {
    return this.yield(value);
};

BufferStream.prototype.close = function (value) {
    return this.return(value);
};

BufferStream.prototype.destroy = // TODO remove support for destroy
BufferStream.prototype.cancel = function (error) {
    return this.throw(error);
};

exports.Iteration = Iteration;
function Iteration(value, done, index) {
    this.value = value;
    this.done = done;
    this.index = index;
}

// ------------------------------------------------------------------------

/**
 * A pipe is a tool for controlling scheduling of work by watching input and
 * output streams.  The pipe receives the true input and produces controlled
 * input and output streams.  The producer is responsible for sending results
 * to the output Queue using the generator API.  The rate at which the producer
 * sends data will regulate the rate at which the consumer can take values from
 * the input iterator.
 * @param {Iterable} trueInput
 * @param {Number?} maxInFlight (infinite if undefined)
 * @returns {{input, output}} pipe The input is an iterator that will only
 * yield up to `maxInFlight` values at a time.  Sending data to the output
 * Queue signals that some input has been taken out of flight.
 * @constructor
 */
exports.Pipe = Pipe;
function Pipe(input, maxInFlight, notify) {
    if (!(this instanceof Pipe)) {
        return new Pipe(input, maxInFlight, notify);
    }

    if (notify) {
        notify = Q(notify);
    }

    var semaphore = makeSemaphore(maxInFlight);
    var inFlight = 0;

    this.input = new BufferStream({
        get: function () {
            return semaphore.get().then(function () {
                if (notify) {
                    inFlight++;
                    notify.call(void 0, inFlight, maxInFlight).done();
                }
                return input.next();
            });
        }
    });

    var output = new Queue();

    this.output = new BufferStream({
        get: function () {
            if (notify) {
                inFlight--;
                notify.call(void 0, inFlight, maxInFlight).done();
            }
            semaphore.put();
            return output.get();
        },
        put: output.put
    });
}


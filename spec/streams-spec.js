
var Q = require("q");
var BufferStream = require("../buffer-stream");
var Reader = require("../reader");

describe("buffer", function () {

    it("should emulate a generator with forEach", function () {
        var buffer = new BufferStream();
        var n = 0;
        buffer.yield(0);
        buffer.yield(1);
        buffer.yield(2);
        buffer.return(10);
        return buffer.next().then(function (iteration) {
            expect(iteration.value).toBe(0);
            expect(iteration.index).toBe(0);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(1);
            expect(iteration.index).toBe(1);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(2);
            expect(iteration.index).toBe(2);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(10);
            expect(iteration.index).toBe(undefined);
            expect(iteration.done).toBe(true);
        })
    });

    it("should emulate a generator with forEach", function () {
        var buffer = new BufferStream();
        var n = 0;
        buffer.yield(0);
        buffer.yield(1);
        buffer.yield(2);
        buffer.return(10);
        return buffer.forEach(function (value) {
            expect(value).toBe(n++);
        })
        .then(function (result) {
            expect(result).toBe(10);
            expect(n).toBe(3);
        });
    });

});

describe("reduce", function () {

    it("should reduce", function () {
        return Reader([1, 2, 3])
        .reduce(function (a, b, index) {
            return a + b;
        }, 0, 1)
        .then(function (sum) {
            expect(sum).toBe(6);
        });
    });

    it("should map reduce", function () {
        return Reader([1, 2, 3])
        .map(function (n) {
            return n * 2;
        }, null, 1)
        .reduce(function (a, b, index) {
            return a + b;
        }, 0, 1)
        .then(function (sum) {
            expect(sum).toBe(12);
        });
    });

    it("should map reduce", function () {
        return Reader([1, 2, 3])
        .map(function (n) {
            return Q(n).delay(n * 10)
        })
        .map(function (m) {
            return m * 2;
        })
        .reduce(function (a, b) {
            return a + b;
        })
        .then(function (sum) {
            expect(sum).toBe(12);
        });
    });

    it("should map reduce with a basis", function () {
        return Reader([1, 2, 3])
        .map(function (n) {
            return Q(n).delay(n * 10)
        })
        .map(function (m) {
            return m * 2;
        })
        .reduce(function (a, b) {
            return a + b;
        }, 1)
        .then(function (sum) {
            expect(sum).toBe(13);
        });
    });

    it("should handle no-basis empty case", function () {
        return Reader([]).reduce(function () {})
        .then(function () {
            expect(true).toBe(false); // should not get here
        }, function (error) {
            expect(error.message).toBe("Can't reduce empty source without a basis");
        });
    });

    it("should take from an iterable", function () {
        var source = {
            iterate: function () {
                var i = 0;
                return {
                    next: function () {
                        if (i <= 4) {
                            return {value: i++};
                        } else {
                            return {done: true};
                        }
                    }
                }
            }
        };
        return Reader(source)
        .map(function (n) {
            return Q(n).delay(100);
        })
        .reduce(function (a, b) {
            return a + b;
        })
        .then(function (sum) {
            expect(sum).toBe(10);
        })
    });

    it("should aggregate opportunistically", function () {
        return Reader([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .map(function (n) {
            return Q(n).delay((10 - n) * 10);
        })
        .reduce(function (a, b) {
            return a + b;
        })
        .then(function (sum) {
        })
    });

    it("supports parallelism limiting", function () {
        var flight = 0;
        return Reader([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        .map(function (n) {
            flight++;
            expect(flight).toBeLessThan(4);
            return n * 2;
        }, null, 1)
        .reduce(function (a, b) {
            flight--;
            return Q(a + b).delay(10);
        }, 0, 3)
        .then(function (sum) {
            expect(sum).toBe(110);
        })
    });

});

describe("map", function () {

    it("an array", function() {
        var buffer = Reader(['one', 'two', 'three'])
        .map(function(s) {
            return s.length;
        });
        return buffer.next()
        .then(function (iteration) {
            expect(iteration.value).toBe(3);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(3);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(5);
            return buffer.next();
        })
        .then(function (iteration) {
            expect(iteration.value).toBe(undefined);
            expect(iteration.done).toBe(true);
        })
    });

    it("map all", function() {
        var buffer = Reader(['one', 'two', 'three'])
        .map(function(s) {
            return s.length;
        })
        .all()
        .then(function (lengths) {
            expect(lengths).toEqual([3, 3, 5]);
        });
    });

    it("maps an array to an array of promises", function() {
        return Reader(['one', 'two', 'three'])
        .map(function(s) {
            return s.length;
        })
        .all()
        .then(function(lengths) {
            expect(lengths[0]).toBe(3);
            expect(lengths[1]).toBe(3);
            expect(lengths[2]).toBe(5);
        })
    });

    it("fails if any of the promises fail", function() {
        return Reader([
            function() {
                throw new Error('raised from inner')
            }
        ])
        .map(Q.try)
        .all()
        .then(function() {
            throw new Error('then handler should not run')
        }, function () {
        })
    });

    it("handles holes", function () {
        return Reader([1,, 2,, 3])
        .map(function (n) {
            return n * 2;
        })
        .all()
        .then(function (values) {
            expect(values[0]).toBe(2);
            expect(values[2]).toBe(4);
            expect(values[4]).toBe(6);
            expect(1 in values).toBe(false);
            expect(3 in values).toBe(false);
        })
    });

    it("chains without delay", function () {
        var start = +new Date();
        return Reader([1, 2, 3])
        .map(function (n) {
            return Q(n).delay((3 - n) * 10);
        })
        .map(function (n) {
            return Q(n).delay(10 * n);
        })
        .all()
        .then(function (ns) {
            expect(ns).toEqual([1, 2, 3]);
            var stop = +new Date();
            expect(stop - start).toBeLessThan(200);
        })
    });

    it("handles indefinite promise queues", function () {
        var buffer = BufferStream();
        var partial = 0;
        buffer.yield(1);
        buffer.yield(2);

        Q().delay(100).then(function () {
            expect(partial).toBe(6);
            buffer.yield(3);
            buffer["return"]();
        });

        return buffer.map(function (n) {
            return n * 2;
        })
        .reduce(function (a, b) {
            partial += b;
            return a + b;
        }, 0)
        .then(function (value) {
            expect(value).toBe(12);
        })
    });

});

describe("forEach", function () {
    it("should forEach", function () {
        var n = 1;
        return Reader([1, 2, 3])
        .forEach(function (v) {
            expect(n++).toEqual(v);
        })
        .then(function (value) {
            expect(value).toBe(void 0);
        });
    });

    it("should yield multiple", function () {
        var deferred = Q.defer();

        var progress = 0;

        Reader([1, 2, 3, 4, 5, 6])
        .forEach(function (v) {
            progress++;
            return Q().delay(100);
        }, null, 3, function (flight) {
            expect(flight).toBeLessThan(4);
        })
        .then(deferred.resolve, deferred.reject);

        return Q()
        .delay(50)
        .then(function () {
            expect(progress).toBe(3);
        })
        .delay(100)
        .then(function () {
            expect(progress).toBe(6);
        })
        .delay(100)
        .then(function () {
            expect(deferred.promise.inspect())
                .toEqual({
                    state: "fulfilled",
                    value: undefined
                })
        })
        .thenResolve(deferred.promise);
    });

});

describe("buffer", function () {

    it("should accumulate up to size", function () {
        var flight = 0;
        return Reader([1, 2, 3, 4, 5, 6, 7, 8])
        .map(function (n) {
            expect(flight).toBeLessThan(4);
            flight++;
            return n;
        }, null, 1)
        .buffer(3, function (flight) {
            expect(flight).toBeLessThan(4);
        })
        .forEach(function (n) {
            flight--;
            expect(flight).toBeLessThan(4);
            return Q().delay(10);
        })
    });

});

describe("buffer stream", function () {

    it("should ack", function () {
        var stream = new BufferStream();
        var got = false;

        Q().delay(50).then(function () {
            expect(got).toBe(false);
            got = true;
            return stream.get();
        })
        .then(function (value) {
            expect(value).toBe(10);
        });

        return stream.put(10)
        .then(function () {
            expect(got).toBe(true);
        })

    });

});


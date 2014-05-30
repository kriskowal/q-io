"use strict";

var Q = require("q");
var Queue = require("q/queue");

module.exports = makeSemaphore;
function makeSemaphore(size) {
    if (size) {
        var semaphore = new Queue();
        for (var index = 0; index < size; index++) {
            semaphore.put();
        }
        return semaphore;
    } else {
        // unlimited infinite promise queue
        return {get: Q, put: noop};
    }
}

function noop() {}


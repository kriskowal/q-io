"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Root = require("../../../fs").Root;
var Mock = require("../../../fs").Mock;
var ASSERT = require("assert");

exports['test merge'] = function (ASSERT, done) {

    var input = {
        "a": 10,
        "b": 20
    };
    var output = Mock(input).toObject();
    Q.when(output, function (output) {
        ASSERT.deepEqual(output, input, 'toObject');
    })
    .fin(done)
    .done()

};

if (require.main === module) {
    require("test").run(exports);
}



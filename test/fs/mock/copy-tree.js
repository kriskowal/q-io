"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Root = FS.Root;
var Mock = FS.Mock;
var ASSERT = require("assert");

exports['test removeTree'] = function (ASSERT, done) {

    // constructs a mock file-system API object
    var mock = Mock({
        "a/b/c/d": 66,
        "a/b/c/e": 99
    });

    Q.when(mock, function (mock) {
        return mock.copyTree("a/b", "a/f").then(function () {
            return [mock.exists("a/f"), mock.exists("a/f/c"), mock.exists("a/f/c/d"), mock.exists("a/f/c/e")]
        }).spread(function (fExists, cExists, dExists, eExists) {
            return ASSERT.ok(fExists && cExists && dExists && eExists, "tree copied");
        });
    })
    .catch(function (error) {
        ASSERT.ok(false, error);
    })
    .finally(done)


};

if (require.main === module) {
    require("test").run(exports);
}


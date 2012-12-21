"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Root = FS.Root;
var Mock = FS.Mock;
var ASSERT = require("assert");

exports['test makeTree'] = function (ASSERT, done) {

    // constructs a mock file-system API object
    var mock = Mock({
        "a": {}
    });

    Q.when(mock, function (mock) {
        return mock.makeTree("a/b/c").then(function () {
            return mock.exists("a/b/c")
        }).then(function (exists) {
            return ASSERT.ok(exists === true, "tree made");
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


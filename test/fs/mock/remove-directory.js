"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Root = FS.Root;
var Mock = FS.Mock;
var ASSERT = require("assert");

exports['test removeDirectory'] = function (ASSERT, done) {

    // constructs a mock file-system API object
    var mock = Mock({
        "folder": {}
    });

    Q.when(mock, function (mock) {
        return mock.removeDirectory("folder").then(function () {
            return mock.exists("folder")
        }).then(function (exists) {
            return ASSERT.ok(exists === false, "directory removed");
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


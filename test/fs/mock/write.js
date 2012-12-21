"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Root = FS.Root;
var Mock = FS.Mock;
var ASSERT = require("assert");

exports['test write'] = function (ASSERT, done) {

    var mock = FS.mock(FS, FS.join(__dirname, 'dummy'));

    Q.when(mock, function (mock) {
        return Q.when(mock.listTree(), function (list) {
            ASSERT.deepEqual(list.sort(), [
                ".", "hello.txt"
            ].sort(), "listTree");
        }).then(function () {
            return mock.write("hello.txt", 'Hello, New World!\n');
        }).then(function () {
            return Q.when(mock.read("hello.txt"), function (hello) {
                ASSERT.strictEqual(hello, 'Hello, New World!\n', 'write content');
            });
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

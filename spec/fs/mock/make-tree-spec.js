"use strict";

require("../../lib/jasmine-promise");
var Q = require("q");
var FS = require("../../../fs");
var Mock = require("../../../fs-mock");
var _n = FS.normal;

describe("makeTree", function () {
    it("should make a branch of a tree", function () {

        var mock = Mock({
            "a": {}
        });

        return Q.fcall(function () {
            return mock.makeTree("a/b/c");
        })

        .then(function () {
            return mock.listTree();
        })
        .then(function (list) {
            expect(list).toEqual([
                ".",
                "a",
                _n("a/b"),
                _n("a/b/c")
            ]);
        })

        .then(function () {
            return mock.exists("a/b/c")
        })
        .then(function (exists) {
            expect(exists).toBe(true);
        })

        .then(function () {
            return mock.isDirectory("a/b/c")
        })
        .then(function (isDirectory) {
            expect(isDirectory).toBe(true);
        })

    });

    it("should make a branch of a tree even if some of it already exists", function () {

        var mock = Mock({
            "a/b": {}
        });

        return Q.fcall(function () {
            return mock.makeTree("a/b/c/d");
        })

        .then(function () {
            return mock.listTree();
        })
        .then(function (list) {
            expect(list).toEqual([
                ".",
                "a",
                _n("a/b"),
                _n("a/b/c"),
                _n("a/b/c/d")
            ]);
        })
    });

});


"use strict";

require("../../lib/jasmine-promise");
var Q = require("q");
var FS = require("../../../fs");
var Mock = require("../../../fs-mock");

describe("copyTree", function () {
    it("should copy a tree", function () {

        var mock = Mock({
            "a/b": {
                "c": {
                    "d": 66,
                    "e": 99
                }
            }
        });

        return Q.fcall(function () {
            return mock.copyTree("a/b", "a/f");
        })
        .then(function () {
            return Q.all([
                mock.isDirectory("a/f"),
                mock.exists("a/f/c"),
                mock.isFile("a/f/c/d"),
                mock.read("a/f/c/e")
            ])
        })
        .then(function (existence) {
            expect(existence.every(Boolean)).toBe(true);
        })

        .then(function () {
            return mock.listTree();
        })
        .then(function (list) {
            expect(list).toEqual([
                ".",
                "a",
                "a/b",
                "a/b/c",
                "a/b/c/d",
                "a/b/c/e",
                "a/f",
                "a/f/c",
                "a/f/c/d",
                "a/f/c/e"
            ]);
        })

    });

});


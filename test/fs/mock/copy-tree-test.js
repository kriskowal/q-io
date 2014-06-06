"use strict";

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

        return Q.try(function () {
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
                FS.normal("a/b"),
                FS.normal("a/b/c"),
                FS.normal("a/b/c/d"),
                FS.normal("a/b/c/e"),
                FS.normal("a/f"),
                FS.normal("a/f/c"),
                FS.normal("a/f/c/d"),
                FS.normal("a/f/c/e")
            ]);
        })

    });

    it("copies trees between systems", function () {

        var mock = Mock({
            "a/b": {
                "c": {
                    "d": 66,
                    "e": 99
                }
            }
        });

        var mock2 = Mock();

        return Q.try(function () {
            return mock.copyTree("a/b", "f", mock2);
        })
        .then(function () {
            return Q.all([
                mock2.isDirectory("f"),
                mock2.exists("f/c"),
                mock2.isFile("f/c/d"),
                mock2.read("f/c/e")
            ])
        })
        .then(function (existence) {
            expect(existence.every(Boolean)).toBe(true);
        })

        .then(function () {
            return mock2.listTree();
        })
        .then(function (list) {
            expect(list).toEqual([
                ".",
                "f",
                FS.normal("f/c"),
                FS.normal("f/c/d"),
                FS.normal("f/c/e")
            ]);
        })

    });
});


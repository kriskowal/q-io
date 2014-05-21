"use strict";

var Q = require("q");
var FS = require("../../fs");

describe("makeTree", function () {
    it("should make a branch of a tree", function () {

        return Q.try(function () {
            return FS.makeTree("a/b/c");
        })

        .then(function () {
            return FS.listTree("a");
        })
        .then(function (list) {
            expect(list).toEqual([
                "a",
                FS.normal("a/b"),
                FS.normal("a/b/c")
            ]);
        })

        .then(function () {
            return FS.exists("a/b/c");
        })
        .then(function (exists) {
            expect(exists).toBe(true);
        })

        .then(function () {
            return FS.isDirectory("a/b/c");
        })
        .then(function (isDirectory) {
            expect(isDirectory).toBe(true);
        })

    });

    it("should make a branch of a tree even if some of it already exists", function () {

        return Q.try(function () {
            return FS.makeTree("a/b/c/d");
        })

        .then(function () {
            return FS.listTree("a");
        })
        .then(function (list) {
            expect(list).toEqual([
                "a",
                FS.normal("a/b"),
                FS.normal("a/b/c"),
                FS.normal("a/b/c/d")
            ]);
        })
        .then(function () {
            return FS.removeTree("a");
        })
    });

    it("should make branch from an absolute path", function () {

        return Q.try(function () {
            return FS.makeTree(FS.absolute("a/b/c/d"));
        })

        .then(function () {
            return FS.listTree("a");
        })
        .then(function (list) {
            expect(list).toEqual([
                "a",
                FS.normal("a/b"),
                FS.normal("a/b/c"),
                FS.normal("a/b/c/d")
            ]);
        })
        .then(function () {
            return FS.removeTree("a");
        })
    });

    it("should tolerate .", function () {
        return Q.try(function () {
            return FS.makeTree(".");
        })
    });
});


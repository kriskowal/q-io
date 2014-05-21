"use strict";

var Q = require("q");
var FS = require("../../../fs");
var Mock = require("../../../fs-mock");

describe("removeTree", function () {
    it("should remove a tree", function () {

        var mock = Mock({
            "a/b": {
                "c": {
                    "d": 66,
                    "e": 99
                }
            }
        });

        return Q.try(function () {
            return mock.removeTree("a/b/c");
        })

        .then(function () {
            return mock.listTree();
        })
        .then(function (list) {
            expect(list).toEqual([
                ".",
                "a",
                FS.normal("a/b")
            ]);
        })

    });

});


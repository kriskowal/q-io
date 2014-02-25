"use strict";

var Q = require("q");
var FS = require("../../../fs");
/*global describe,it,expect */

describe("append", function () {

    it("appends to a file on a mock filesystem", function () {
        return FS.mock(FS.join(__dirname, "fixture"))
        .then(function (mock) {
            return Q.try(function () {
                return mock.append("hello.txt", "Goodbye!\n");
            })
            .then(function () {
                return mock.read("hello.txt");
            })
            .then(function (contents) {
                expect(contents).toBe("Hello, World!\nGoodbye!\n");
            });
        });
    });

    it("calls open correctly", function () {
        return FS.mock(FS.join(__dirname, "fixture"))
        .then(function (mock) {
            mock.open = function (path, options) {
                expect(path).toBe("hello.txt");
                expect(options.flags).toBe("a");
                expect(options.charset).toBe("utf8");

                return Q({write: Q, close: Q});
            };

            return mock.append("hello.txt", "Goodbye!\n", "a", "utf8");
        });
    });

});


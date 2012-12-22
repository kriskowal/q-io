"use strict";

require("../../lib/jasmine-promise");
var Q = require("q");
var FS = require("../../../fs");

describe("removeDirectory", function () {
    it("should remove a directory", function () {

        return FS.mock(FS, FS.join(__dirname))
        .then(function (mock) {

            // now you see it
            return Q.fcall(function () {
                return mock.isDirectory("dummy");
            })
            .then(function (isDirectory) {
                expect(isDirectory).toBe(true);
            })

            .then(function () {
                return mock.removeDirectory("dummy");
            })

            // now you don't
            .then(function () {
                return mock.isDirectory("dummy");
            })
            .then(function (isDirectory) {
                expect(isDirectory).toBe(false);
            })

        });

    });
});


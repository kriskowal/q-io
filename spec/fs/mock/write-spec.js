"use strict";

require("../../lib/jasmine-promise");
var Q = require("q");
var FS = require("../../../fs");
var EOL = require('os').EOL;

describe("write", function () {
    it("should write a file to a mock filesystem", function () {

        return FS.mock(FS.join(__dirname, "fixture"))
        .then(function (mock) {

            return Q.fcall(function () {
                return mock.write("hello.txt", "Goodbye!" + EOL);
            })
            .then(function () {
                return mock.isFile("hello.txt");
            })
            .then(function (isFile) {
                expect(isFile).toBe(true);
            })

        });
    });
});


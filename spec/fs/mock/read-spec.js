"use strict";

require("../../lib/jasmine-promise");
var Q = require("q");
var FS = require("../../../fs");
var EOL = require('os').EOL;

describe("read", function () {
    it("should read a file from a mock filesystem", function () {

        return FS.mock(FS.join(__dirname, "fixture"))
        .then(function (mock) {

            return Q.fcall(function () {
                return mock.read("hello.txt");
            })
            .then(function (content) {
                expect(content).toBe("Hello, World!" + EOL);
            })

        });
    });
});


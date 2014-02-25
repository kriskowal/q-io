
var FS = require("../../fs");

describe("contains", function () {
    it("reflexive case", function () {
        expect(FS.contains("/a/b", "/a/b")).toBe(true);
    });
});


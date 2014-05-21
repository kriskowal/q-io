
var FS = require("../../fs");

var specs = [
    {
        "from": "foo",
        "to": ""
    },
    {
        "from": "",
        "to": ".."
    },
    {
        "from": ".",
        "to": ".."
    },
    {
        "from": "..",
        "to": FS.normal("../..")
    },
    {
        "from": "../foo",
        "to": ".."
    },
    {
        "from": "/foo/bar",
        "to": FS.normal("/foo")
    },
    {
        "from": "/foo",
        "to": FS.normal("/")
    },
    {
        "from": "/",
        "to": "/"
    }
];

describe("fs-boot directory", function () {
    specs.forEach(function (spec) {
        it("should parse " + JSON.stringify(spec.from), function () {
            expect(FS.directory(spec.from)).toBe(spec.to);
        });
    });
});


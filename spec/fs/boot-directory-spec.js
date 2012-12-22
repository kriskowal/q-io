
var FS = require("../../fs-boot");

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
        "to": "../.."
    },
    {
        "from": "../foo",
        "to": ".."
    },
    {
        "from": "/foo/bar",
        "to": "/foo"
    },
    {
        "from": "/foo",
        "to": "/"
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


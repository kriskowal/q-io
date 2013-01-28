
var FS = require("../../fs-boot");
var _n = FS.normal;

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
        "to": _n("../..")
    },
    {
        "from": "../foo",
        "to": ".."
    },
    {
        "from": "/foo/bar",
        "to": _n("/foo")
    },
    {
        "from": "/foo",
        "to": _n("/")
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



require("../lib/jasmine-promise");
var Q = require("q");
var Http = require("../../http");
var Apps = require("../../http-apps");
var FS = require("../../fs");

describe("http client and server apps", function () {

    it("should read a partial range", function () {
        var fixture = FS.join(module.directory || __dirname, "fixtures", "1234.txt");
        return Http.Server(Apps.Cap(Apps.File(fixture)))
        .listen(0)
        .then(function (server) {
            var port = server.node.address().port;
            return Http.read({
                "url": "http://127.0.0.1:" + port + "/",
                "headers": {
                    "range": "bytes=1-2"
                }
            }, function (response) {
                return response.status === 206;
            })
            .then(function (content) {
                expect(content.toString('utf-8')).toEqual('23');
            })
            .finally(server.stop)
        })
    });

});


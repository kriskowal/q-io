
require("../lib/jasmine-promise");
var Q = require("q");
var Http = require("../../http");
var Apps = require("../../http-apps");
var FS = require("../../fs");

describe("http proxy", function () {

    it("should work", function () {

        var requestProxy;
        var responseProxy;
        var requestActual;
        var responseActual;

        var server1 = Http.Server(
            Apps.Trap(
                Apps.Tap(
                    Apps.Branch({
                        "foo": Apps.Branch({
                            "bar": Apps.Cap(Apps.Content(["Hello, World!"]))
                        })
                    }),
                    function (request) {
                        requestActual = request;
                    }
                ),
                function (response) {
                    responseActual = response;
                    return response;
                }
            )
        );

        return Q.when(server1.listen(0))
        .then(function (server1) {
            var port = server1.node.address().port;

            var server2 = Http.Server(
                Apps.Trap(
                    Apps.Tap(
                        Apps.ProxyTree("http://127.0.0.1:" + port + "/foo/"),
                        function (request) {
                            requestProxy = request;
                        }
                    ),
                    function (response) {
                        responseProxy = response;
                        return response;
                    }
                )
            );

            return [server1, server2.listen(0)];
        })
        .spread(function (server1, server2) {
            var port = server2.node.address().port;
            return Http.read({
                url: "http://127.0.0.1:" + port + "/bar",
                charset: "utf-8"
            })
            .then(function (content) {
                expect(content).toBe("Hello, World!");
                expect(requestActual).toBeTruthy();
                expect(responseActual).toBeTruthy();
                expect(requestProxy).toBeTruthy();
                expect(responseProxy).toBeTruthy();
            })
            .finally(server1.stop)
            .finally(server2.stop)
        })

    });

});


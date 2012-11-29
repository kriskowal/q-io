
var Q = require("q");
var Http = require("../../http");
var Apps = require("../../http-apps");

exports['test proxy'] = function (assert, done) {

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

    Q.when(server1.listen(0))
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
        return Http.read("http://127.0.0.1:" + port + "/bar")
        .then(function (content) {
            assert.equal(content, "Hello, World!", "content");
            assert.ok(requestActual, "request actual");
            assert.ok(responseActual, "response actual");
            assert.ok(requestProxy, "request proxy");
            assert.ok(responseProxy, "response proxy");
        })
        .finally(server1.stop)
        .finally(server2.stop)
    })
    .fail(function (reason) {
        assert.ok(false, reason);
    })
    .finally(done)

};

if (require.main === module)
    require("test").run(exports);


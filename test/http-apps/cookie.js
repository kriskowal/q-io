
var Http = require("../../http");
var Apps = require("../../http-apps");

["localhost", "127.0.0.1"].forEach(function (host) {

    exports["test cookie " + host] = function (assert, done) {

        var server = Http.Server(function (request) {
            return {
                status: 200,
                headers: {
                    "set-cookie": "a=10; MaxAge=1"
                },
                body: [request.headers.cookie || ""]
            };
        });

        var request = Apps.Normalize(Apps.CookieJar(Http.request));

        server.listen(0)
        .then(function (server) {
            var address = server.node.address();
            return request("http://" + host + ":" + address.port)
            .get("body")
            .invoke("read")
            .invoke("toString", "utf-8")
            .then(function (content) {
                assert.equal(content, "", "no cookie first time");
                return request("http://" + host + ":" + address.port)
                .get("body")
                .invoke("read")
                .invoke("toString", "utf-8")
            })
            .then(function (content) {
                assert.equal(content, "a=10", "cookie set second time");
            })
        })
        .timeout(1000)
        .finally(server.stop)
        .fail(function (reason) {
            assert.ok(false, reason);
        })
        .finally(done)

    };

});

if (require.main === module)
    require("test").run(exports);


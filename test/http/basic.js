
var Q = require("q");
var HTTP = require("../../http");

exports['test basic'] = function (ASSERT, done) {

    var response = {
        "status": 200,
        "headers": {
            "content-type": "text/plain"
        },
        "body": [
            "Hello, World!"
        ]
    };

    var server = HTTP.Server(function () {
        return response;
    });

    Q.when(server.listen(0), function (server) {
        var port = server.node.address().port;

        var request = {
            "host": "localhost",
            "port": port,
            "headers": {
                "host": "localhost"
            }
        };

        return Q.when(HTTP.request(request))
        .then(function (response) {
            ASSERT.ok(!Q.isPromise(response.body), "body is not a promise")
            var acc = [];
            return response.body.forEach(function (chunk) {
                acc.push(chunk.toString("utf-8"));
            }).then(function () {
                ASSERT.equal(acc.join(""), "Hello, World!", "body is hello world");
            });
        })
    })
    .fin(server.stop)
    .fin(done)
    .fail(function (reason) {
        ASSERT.ok(false, reason);
    })

}

exports['test deferred'] = function (ASSERT, done) {

    var response = {
        "status": 200,
        "headers": {
            "content-type": "text/plain; charset=utf-8"
        },
        "body": {
            "forEach": function (write) {
                var deferred = Q.defer();
                write("Hello, World!");
                setTimeout(function () {
                    deferred.resolve();
                }, 100);
                return deferred.promise;
            }
        }
    };

    var server = HTTP.Server(function () {
        return response;
    });

    Q.when(server.listen(0), function (server) {
        var port = server.node.address().port;

        var request = {
            "host": "localhost",
            "port": port,
            "headers": {
                "host": "localhost"
            }
        };

        return Q.when(HTTP.request(request))
        .then(function (response) {
            var acc = [];
            return response.body.forEach(function (chunk) {
                acc.push(chunk.toString("utf-8"));
            }).then(function () {
                ASSERT.equal(acc.join(""), "Hello, World!", "body is hello world");
            });
        })
    })
    .fin(server.stop)
    .fin(done)
    .fail(function (reason) {
        ASSERT.ok(false, reason);
    })

}

if (module === require.main) {
    require("test").run(exports);
}


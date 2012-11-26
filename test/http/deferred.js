
var Q = require("q");
var HTTP = require("../../http");

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
            }, 1000);
            return deferred.promise;
        }
    }
};

var server = HTTP.Server(function () {
    return response;
});

Q.done(server.listen(0), function () {
    var port = server.node.address().port;

    var request = {
        "host": "localhost",
        "port": port,
        "headers": {
            "host": "localhost"
        }
    };

    return Q.when(HTTP.request(request), function (response) {
        return Q.when(response.body, function (body) {
            var done = body.forEach(function (chunk) {
                console.log(chunk.toString("utf-8"));
            });
            Q.when(done, server.stop);
        });
    });
});



var Q = require("q");
var HTTP = require("../../http");

var request = {
    "host": "localhost",
    "port": 8080,
    "headers": {
        "host": "localhost"
    }
};

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

Q.done(server.listen(8080), function () {

    var done = [1,2,3].reduce(function (done) {
        return Q.when(HTTP.request(request), function (response) {
            return Q.when(response.body, function (body) {
                return Q.all([body.forEach(function (chunk) {
                    console.log(chunk.toString('utf-8'));
                }), done]);
            });
        });
    }, undefined);

    return Q.when(done, server.stop);
});


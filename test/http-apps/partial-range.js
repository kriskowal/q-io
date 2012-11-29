
var Http = require("../../http");
var FS = require("../../fs");
var Apps = require("../../http-apps");

var fixture = FS.join(module.directory || __dirname, "fixtures", "1234.txt");

exports['test partial range request'] = function (assert, done) {
    Http.Server(Apps.Cap(Apps.File(fixture)))
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
            assert.equal(content.toString('utf-8'), '23', '1234[1-2] = 23');
        }, function (error) {
            console.log(error);
            throw error;
        })
        .fin(server.stop)
    })
    .finally(done)
    .done();
};

if (require.main === module)
    require("test").run(exports);


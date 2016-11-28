
require("../lib/jasmine-promise");
var Q = require("q");
var HTTP = require("../../http");
var iconv = require("iconv-lite");

describe("http server and client", function () {

    it("should work as both server and client", function () {
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

        return server.listen(0)
        .then(function (server) {
            var port = server.address().port;

            var request = {
                "host": "localhost",
                "port": port,
                "headers": {
                    "host": "localhost"
                }
            };

            return HTTP.request(request)
            .then(function (response) {
                expect(Q.isPromise(response.body)).toBe(false);
                return response.body.read()
                .then(function (body) {
                    expect(body.toString("utf-8")).toBe("Hello, World!");
                });
            })
        })
        .finally(server.stop)
    });

    it("should defer a response", function () {
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

        return server.listen(0).then(function (server) {
            var port = server.node.address().port;

            var request = {
                "host": "localhost",
                "port": port,
                "headers": {
                    "host": "localhost"
                },
                "charset": "utf-8"
            };

            return HTTP.request(request)
            .then(function (response) {
                var acc = [];
                return response.body.read()
                .then(function (body) {
                    expect(body).toBe("Hello, World!");
                });
            })
        })
        .finally(server.stop)
    });

    it('should successfully access resources that require HTTP Basic authentication when using the username:password@host.com URL syntax', function(){
        // This tries to access a public resource, see http://test.webdav.org/
        //
        // The resource is password protected, but there's no content behind it
        // so we will actually receive a 404; that's ok though as at least it's
        // a well-defined and expected status.
        return HTTP.request('http://user1:user1@test.webdav.org/auth-basic/')
        .then(function(response){
            expect(response.status).not.toBe(401);
            expect(response.status).toBe(404);
        });
    });

    it("should timeout request when timeout specified", function() {
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
            return Q.delay(response, 300);
        });

        return server.listen(0)
        .then(function (server) {
            var port = server.address().port;

            var request = {
                "host": "localhost",
                "port": port,
                "headers": {
                    "host": "localhost"
                },
                "timeout": 100
            };

            return HTTP.request(request)
            .thenResolve(false)
            .catch(function (err) {
                return true;
            })
            .then(function (timedout) {
                expect(timedout).toBe(true);
            });
        })
        .finally(server.stop)
    });

    it("should correctly convert response buffers to string during read()", function () {
        var responseStr = "Accented characters: öäüß",
            charset = "Windows-1252",
            response = {
            "status": 200,
            "headers": {
                "content-type": "text/plain; charset=" + charset
            },
            "body": [
                iconv.encode(responseStr, charset)
            ]
        };

        var server = HTTP.Server(function () {
            return response;
        });

        return server.listen(0)
        .then(function (server) {
            return HTTP.read({
                "host": "localhost",
                "port": server.address().port,
                "headers": {
                    "host": "localhost"
                }
            })
            .then(function (body) {
                expect(body).toBe(responseStr);
            });
        })
        .finally(server.stop)
    });
});


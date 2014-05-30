"use strict";

var Q = require("q");
var HTTP = require("./http");
var FS = require("./fs");
var URL = require("url");

exports.Client = Client;
function Client(fs) {
    var self = Object.create(Client.prototype);

    self.request = function (request) {
        return Q(request).then(function (request) {
            request = HTTP.normalizeRequest(request);
            var url = URL.parse(request.url);
            if (url.protocol !== "file:") {
                return {
                    status: 404,
                    headers: {},
                    body: ["Can't access protocol " + url.protocol]
                };
            } else {
                var path = url.pathname;
                return fs.open(path, {
                    charset: request.charset
                }).then(function (body) {
                    return {
                        status: 200,
                        headers: {},
                        body: body
                    };
                });
            }
        });
    };

    self.read = function (request, qualifier) {
        qualifier = qualifier || function (response) {
            return response.status === 200;
        };
        return exports.request(request).then(function (response) {
            if (!qualifier(response)){
                var error = new Error("HTTP request failed with code " + response.status);
                error.response = response;
                throw error;
            }
            return Q(response.body).invoke("read");
        });
    };

    return self;
}

exports.request = function (request) {
    return Client(fs).request(request);
};

exports.read = function (request, qualifier) {
    return Client(fs).read(request);
};



var RouteApps = require("./route");

var farFuture =
    1000 * // ms
    60 * // s
    60 * // m
    24 * // h
    365 * // d
    10; // years
exports.Permanent = function (app, future) {
    future = future || function () {
        return new Date(new Date().getTime() + farFuture);
    };
    app = RouteApps.Tap(app, function (request, response) {
        request.permanent = future;
    });
    app = RouteApps.Trap(app, function (response, request) {
        response.headers["expires"] = "" + future();
    });
    return app;
};


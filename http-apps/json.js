"use strict";

var Q = require("q");
var Content = require("./content");
var Status = require("./status");

exports.HandleJsonResponses = function (app, reviver, tab) {
    return function (request) {
        request.handleJsonResponse = exports.handleJsonResponse;
        return Q(app).call(void 0, request)
        .then(function (response) {
            if (response.data !== void 0) {
                return exports.handleJsonResponse(response, reviver, tab);
            } else {
                return response;
            }
        });
    };
};

exports.handleJsonResponse = function (response, revivier, tab) {
    response.headers["content-type"] = "application/json";
    response.body = [JSON.stringify(response.data, reviver, tab)];
    return response;
};

/**
 * Wraps a Q-JSGI application such that the child application may
 * simply return an object, which will in turn be serialized into a
 * Q-JSGI response.
 *
 * @param {Function(Request):Object} app an application that accepts a
 * request and returns a JSON serializable object.
 * @returns {App}
 */
exports.Json = function (app, reviver, tabs) {
    return function (request, response) {
        return Q(app).call(void 0, request)
        .then(function (object) {
            return exports.json(object, reviver, tabs);
        });
    };
};

/**
 * @param {Object} content data to serialize as JSON
 * @param {Function} reviver
 * @param {Number|String} tabs
 * @returns {Response}
 */
exports.json = function (content, reviver, tabs) {
    return Content.ok([JSON.stringify(content, reviver, tabs)]);
};

/**
 * @param {Function(Request, Object):Response} app
 * @param {App} badRequest
 * @returns {App}
 */
exports.JsonRequest = function (app, badRequest) {
    if (!badRequest)
        badRequest = Status.badRequest;
    return Content.ContentRequest(function (content, request, response) {
        try {
            var object = JSON.parse(content);
        } catch (error) {
            return badRequest(request, error);
        }
        return app(object, request, response);
    });
};


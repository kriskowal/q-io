
/**
 * Provides tools for making, routing, adapting, and decorating
 * Q-JSGI web applications.
 *
 * Duck Types
 * ----------
 *
 * A Q-JSGI _app_ is a function that accepts a request and returns a
 * response.  The response may be promised.
 *
 * A Q-JSGI _request_ is an object or a promise for an object that has
 * the following properties:
 *
 * * `method` is the HTTP request method as a string.
 * * `path` is a string, guaranteed to start with `"/"`.
 * * `headers` is an object mapping lower-case HTTP headers to
 *   their corresponding values as strings.
 * * `body` is a Q-JSGI content body.
 *
 * A Q-JSGI _response_ is an object or a promise for an object that
 * has the following properties:
 *
 * * `status` is the HTTP response status code as a number.
 * * `headers` is an object mapping lower-case HTTP headers to their
 *   corresponding values as strings.
 * * `body` is a Q-JSGI content body.
 *
 * A Q-JSGI response and request content _body_ can be as simple as an
 * array of strings.  It can be a promise.  In general, it must be an
 * object that has a `forEach` method.  The `forEach` method accepts a
 * `write` function.  It goes without saying that `forEach` returns
 * `undefined`, but it can return a promise for `undefined` that will
 * resolve when it has made all of its `write` calls and the request
 * or response can be closed, re-used, or kept alive..  The `forEach`
 * function may call `write` with a `String` any number of times.  The
 * `String` may be promised.
 *
 * @module
 */

/*
    Multiplexing Routing:
        Cap
        Branch
        Method
        Accept
        Language
    Trial Routing:
        FirstFound
    Decorators:
        Error
        Log
        CookieSession TODO reevaluate
        PathSession TODO reevaluate
        Limit TODO
        Cache TODO
        Time
        Decorators
        Tap
        Trap
        Permanent
        Date
    Adapters:
        ParseQuery
        ContentRequest
        JsonRequest
        Json
        Inspect
    Producers:
        Content
        File
        FileTree
        Redirect
        PermanentRedirect
        TemporaryRedirect
        RedirectTree
        PermanentRedirectTree
        TemporaryRedirectTree
    Producer Functions:
        ok
        badRequest
        notFound
        methodNotAllowed
        notAcceptable
        file
        directory
        redirect
        json
    Utility:
        etag

*/

require("collections/shim");
var Q = require("q");
var NODE_FS = require("fs");
var HTTP = require("./http");
var FS = require("./fs");
var URL = require("url");
var MIME_PARSE = require("mimeparse");
var MIME_TYPES = require("mime");
var URL = require("url");
var inspect = require("util").inspect;
var QS = require("querystring");
var Cookie = require("./http-cookie");

//var UUID = require("uuid");
var UUID = {
    generate: function () {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
};

/**
 * Makes a  Q-JSGI app that only responds when there is nothing left
 * on the path to route.  If the there is unprocessed data on the
 * path, the returned app either forwards to the `notFound` app or
 * returns a `404 Not Found` response.
 *
 * @param {App} app a Q-JSGI application to
 * respond to this end of the routing chain.
 * @param {App} notFound (optional) defaults
 * to the `notFound` app.
 * @returns {App}
 */
exports.Cap = function (app, notFound) {
    notFound = notFound || exports.notFound;
    return function (request, response) {
        // TODO Distinguish these cases
        if (request.pathInfo === "" || request.pathInfo === "/") {
            return app(request, response);
        } else {
            return notFound(request, response);
        }
    };
};

/**
 * Wraps an app with a function that will observe incoming requests
 * before giving the app an opportunity to respond.  If the "tap"
 * function returns a response, it will be used in lieu of forwarding
 * the request to the wrapped app.
 */
exports.Tap = function (app, tap) {
    return function (request, response) {
        var self = this, args = arguments;
        return Q.when(tap.apply(this, arguments), function (response) {
            if (response) {
                return response;
            } else {
                return app.apply(self, args);
            }
        });
    };
}

/**
 * Wraps an app with a "trap" function that intercepts and may
 * alter or replace the response of the wrapped application.
 */
exports.Trap = function (app, trap) {
    return function (request, response) {
        return Q.when(app.apply(this, arguments), function (response) {
            if (response) {
                response.headers = response.headers || {};
                return trap(response, request) || response;
            }
        });
    };
}

exports.Date = function (app, present) {
    present = present || function () {
        return new Date();
    };
    return exports.Trap(app, function (response, request) {
        response.headers["date"] = "" + present();
    });
};

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
    app = exports.Tap(app, function (request, response) {
        request.permanent = future;
    });
    app = exports.Trap(app, function (response, request) {
        response.headers["expires"] = "" + future();
    });
    return app;
};

/**
 * Makes a Q-JSGI app that branches requests based on the next
 * unprocessed path component.
 * @param {Object * App} paths a mapping from path components (single
 * file or directory names) to Q-JSGI applications for subsequent
 * routing.  The mapping may be a plain JavaScript `Object` record,
 * which must own the mapping properties, or an object that has
 * `has(key)` and `get(key)` methods in its prototype chain.
 * @param {App} notFound a Q-JSGI application
 * that handles requests for which the next file name does not exist
 * in paths.
 * @returns {App}
 */
exports.Branch = function (paths, notFound) {
    if (!paths)
        paths = {};
    if (!notFound)
        notFound = exports.notFound;
    return function (request, response) {
        if (!/^\//.test(request.pathInfo)) {
            return notFound(request, response);
        }
        var path = request.pathInfo.slice(1);
        var parts = path.split("/");
        var part = decodeURIComponent(parts.shift());
        if (Object.has(paths, part)) {
            request.scriptName = request.scriptName + part + "/";
            request.pathInfo = path.slice(part.length);
            return Object.get(paths, part)(request, response);
        }
        return notFound(request, response);
    };
};

/**
 * Makes an app that returns a response with static content
 * from memory.
 * @param {Body} body a Q-JSGI
 * response body
 * @param {String} contentType
 * @param {Number} status
 * @returns {App} a Q-JSGI app
 */
exports.Content = function (body, contentType, status) {
    return function (request, response) {
        return {
            "status": status || 200,
            "headers": {
                "content-type": contentType || "text/plain"
            },
            "body": body || ""
        };
    };
};

/**
 * Returns a Q-JSGI response with the given content.
 * @param {Body} content (optional) defaults to `[""]`
 * @param {String} contentType (optional) defaults to `"text/plain"`
 * @param {Number} status (optional) defaults to `200`
 * @returns {Response}
 */
exports.content =
exports.ok = function (content, contentType, status) {
    status = status || 200;
    content = content || "";
    if (typeof content === "string") {
        content = [content];
    }
    contentType = contentType || "text/plain";
    return {
        "status": status,
        "headers": {
            "content-type": contentType
        },
        "body": content
    };
};

/**
 * @param {String} path
 * @param {String} contentType
 * @returns {App}
 */
exports.File = function (path, contentType) {
    return function (request, response) {
        return exports.file(request, String(path), contentType);
    };
};

/**
 * @param {String} path
 * @param {{
       notFound,
       file,
       directory,
       contentType,
       redirectSymbolicLinks:Boolean,
       redirect:Function(location),
       permanent:Boolean
 * }} options
 * @returns {App}
 */
exports.FileTree = function (root, options) {
    if (!options)
        options = {};
    options.notFound = options.notFound || exports.notFound;
    options.file = options.file || exports.file;
    options.directory = options.directory || exports.directory;
    root = FS.canonical(root);
    return function (request, response) {
        var redirect = options.redirect || (
            request.permanent || options.permanent ?
            exports.permanentRedirect :
            exports.temporaryRedirect
        );
        return Q.when(root, function (root) {
            var path = FS.join(root, request.pathInfo.slice(1));
            return Q.when(FS.canonical(path), function (canonical) {
                if (!FS.contains(root, canonical))
                    return options.notFound(request, response);
                if (path !== canonical && options.redirectSymbolicLinks)
                    return redirect(request, FS.relativeFromFile(path, canonical));
                // TODO: relativeFromFile should be designed for URL’s, not generalized paths.
                return Q.when(FS.stat(canonical), function (stat) {
                    if (stat.isFile()) {
                        return options.file(request, canonical, options.contentType);
                    } else if (stat.isDirectory()) {
                        return options.directory(request, canonical, options.contentType);
                    } else {
                        return options.notFound(request, response);
                    }
                });
            }, function (reason) {
                return options.notFound(request, response);
            });
        });
    };
};

/**
 * @param {Request} request
 * @param {String} path
 * @param {String} contentType
 * @returns {Response}
 */
exports.file = function (request, path, contentType) {
    // TODO last-modified header
    contentType = contentType || MIME_TYPES.lookup(path);
    return Q.when(FS.stat(path), function (stat) {
        var etag = exports.etag(stat);
        var range; // undefined or {begin, end}
        var status = 200;
        var headers = {
            "content-type": contentType,
            "etag": etag
        };

        // Partial range requests
        if ("range" in request.headers) {
            // Invalid cache
            if (
                "if-range" in request.headers &&
                etag != request.headers["if-range"]
            ) {
                // Normal 200 for entire, altered content
            } else {
                // Truncate to the first requested continuous range
                range = interpretFirstRange(request.headers["range"]);
                // Like Apache, ignore the range header if it is invalid
                if (range) {
                    if (range.end > stat.size)
                        return exports.responseForStatus(416); // not satisfiable
                    status = 206; // partial content
                    headers["content-range"] = (
                        "bytes " +
                        range.begin + "-" + (range.end - 1) +
                        "/" + stat.size
                    );
                    headers["content-length"] = "" + (range.end - range.begin);
                }
            }
        // Full requests
        } else {
            // Cached
            // We do not use date-based caching
            // TODO consider if-match?
            if (etag == request.headers["if-none-match"])
                return exports.responseForStatus(304);
            headers["content-length"] = "" + stat.size;
        }

        // TODO sendfile
        return {
            "status": status,
            "headers": headers,
            "body": FS.open(path, range)
        };
    });
};

var rangesExpression = /^\s*bytes\s*=\s*(\d*\s*-\s*\d*\s*(?:,\s*\d*\s*-\s*\d*\s*)*)$/;
var rangeExpression = /^\s*(\d*)\s*-\s*(\d*)\s*$/;

var interpretRange = function (text, size) {
    var match = rangeExpression.exec(text);
    if (!match)
        return;
    if (match[1] == "" && match[2] == "")
        return;
    var begin, end;
    if (match[1] == "") {
        begin = size - match[2];
        end = size;
    } else if (match[2] == "") {
        begin = +match[1];
        end = size;
    } else {
        begin = +match[1];
        end = +match[2] + 1;
    }
    return {
        "begin": begin,
        "end": end
    };
};

var interpretFirstRange = exports.interpretFirstRange = function (text, size) {
    var match = rangesExpression.exec(text);
    if (!match)
        return;
    var texts = match[1].split(/\s*,\s*/);
    var range = interpretRange(texts[0], size);
    for (var i = 0, ii = texts.length; i < ii; i++) {
        var next = interpretRange(texts[i], size);
        if (!next)
            break;
        if (next.begin <= range.end) {
            range.end = next.end;
        } else {
            break;
        }
    }
    return range;
};

/**
 * @param {Stat}
 * @returns {String}
 */
exports.etag = function (stat) {
    return [
        stat.node.ino,
        stat.size,
        stat.lastModified().getTime()
    ].join("-");
};

/**
 * @param {Request} request
 * @param {String} path
 * @param {Response}
 */
exports.directory = function (request, path) {
    return Q.reject("directory listing not yet implemented");
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `301`
 * @returns {App}
 */
exports.PermanentRedirect = function (location, status, tree) {
    return function (request, response) {
        return exports.permanentRedirect(request, location, status, tree);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `301`
 * @returns {App}
 */
exports.PermanentRedirectTree = function (location, status) {
    return function (request, response) {
        return exports.permanentRedirect(request, location, status, true);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `307`
 * @returns {App}
 */
exports.TemporaryRedirect = function (location, status, tree) {
    return function (request, response) {
        return exports.temporaryRedirect(request, location, status, tree);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `307`
 * @returns {App}
 */
exports.TemporaryRedirectTree = function (location, status) {
    return function (request, response) {
        return exports.temporaryRedirect(request, location, status, true);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `307`
 * @returns {App}
 */
exports.Redirect = function (location, status, tree) {
    return function (request, response) {
        return exports.redirect(request, location, status, tree);
    };
};

/**
 * @param {String} path
 * @param {Number} status (optional) default is `307`
 * @returns {App}
 */
exports.RedirectTree = function (location, status) {
    return function (request, response) {
        return exports.redirect(request, location, status, true);
    };
};

exports.permanentRedirect = function (request, location, status) {
    return exports.redirect(request, location, status || 301);
};

exports.permanentRedirectTree = function (request, location, status) {
    return exports.redirect(request, location, status || 301, true);
};

exports.temporaryRedirect = function (request, location, status) {
    return exports.redirect(request, location, status || 307);
};

exports.temporaryRedirectTree = function (request, location, status) {
    return exports.redirect(request, location, status || 307, true);
};

exports.redirectTree = function (request, location, status) {
    return exports.redirect(request, location, status, true);
};

/**
 * @param {String} location
 * @param {Number} status (optional) default is `301`
 * @returns {Response}
 */
exports.redirect = function (request, location, status, tree) {

    // request.permanent gets set by Permanent middleware
    status = status || (request.permanent ? 301 : 307);

    // ascertain that the location is absolute, per spec
    location = URL.resolve(request.url, location);

    // redirect into a subtree with the remaining unrouted
    // portion of the path, if so configured
    if (tree) {
        location = URL.resolve(
            location,
            request.pathInfo.replace(/^\//, "")
        );
    }

    return {
        "status": status,
        "headers": {
            "location": location,
            "content-type": "text/html"
        },
        "body": [
            'Go to <a href="' + location + '">' + // TODO escape
            location +
            "</a>"
        ]
    };
};

exports.Proxy = function (app) {
    if (typeof app === "string") {
        var location = app;
        app = function (request) {
            request.url = location;
            return request;
        };
    }
    return function (request, response) {
        return Q.when(app.apply(this, arguments), function (request) {
            return HTTP.request(request);
        });
    };
};

exports.ProxyTree = function (url) {
    return exports.Proxy(function (request) {
        request.url = URL.resolve(url, request.pathInfo.replace(/^\//, ""));
        return request;
    });
};

/// branch on HTTP method
/**
 * @param {Object * App} methods
 * @param {App} notAllowed (optional)
 * @returns {App}
 */
exports.Method = function (methods, methodNotAllowed) {
    var keys = Object.keys(methods);
    if (!methodNotAllowed)
        methodNotAllowed = exports.methodNotAllowed;
    return function (request, response) {
        var method = request.method;
        if (Object.has(keys, method)) {
            return Object.get(methods, method)(request, response);
        } else {
            return methodNotAllowed(request, response);
        }
    };
};

var Negotiator = function (requestHeader, responseHeader, respond) {
    return function (types, notAcceptable) {
        var keys = Object.keys(types);
        if (!notAcceptable)
            notAcceptable = exports.notAcceptable;
        return function (request, response) {
            var header = requestHeader;
            if (typeof header === "function") {
                header = requestHeader(request);
            }
            var accept = request.headers[requestHeader] || "*";
            var type = MIME_PARSE.bestMatch(keys, accept);
            request.terms = request.terms || {};
            request.terms[responseHeader] = type;
            if (Object.has(keys, type)) {
                return Q.when(types[type](request, response), function (response) {
                    if (
                        respond !== null &&
                        response &&
                        response.status === 200 &&
                        response.headers
                    ) {
                        response.headers[responseHeader] = type;
                    }
                    return response;
                });
            } else {
                return notAcceptable(request, response);
            }
        };
    };
};

/// branch on HTTP content negotiation
/**
 * Routes based on content negotiation, between the request's `accept`
 * header and the application's list of possible content types.
 *
 * @param {Object * App} types mapping content types to apps that can
 * handle them.
 * @param {App} notAcceptable
 * @returns {App}
 */
exports.ContentType = Negotiator("accept", "content-type");
exports.Language = Negotiator("accept-language", "language");
exports.Charset = Negotiator("accept-charset", "charset");
exports.Encoding = Negotiator("accept-encoding", "encoding");
exports.Host = Negotiator(function (request) {
    return (request.headers.host || "*") + ":" + request.port;
}, "host", null);

// Branch on a selector function based on the request
exports.Select = function (select) {
    return function (request, response) {
        return Q.when(select(request, response), function (app) {
            return app(request, response);
        });
    };
};

// Create an application from the "app" exported by a module
exports.require = function (id, _require) {
    _require = _require || require;
    var async = _require.async || _require;
    var exports = async(id);
    return function (request, response) {
        return Q.when(exports, function (exports) {
            return exports.app(request, response);
        });
    }
};

/**
 * Decorates a JSGI application such that rejected response promises
 * get translated into `500` server error responses with no content.
 *
 * @param {App} app
 * @returns {App}
 */
exports.Error = function (app, debug) {
    return function (request, response) {
        return Q.when(app(request, response), null, function (error) {
            if (!debug)
                error = undefined;
            return exports.responseForStatus(500, error && error.stack || error);
        });
    };
};

/**
 * Decorates a Q-JSGI application such that all requests and responses
 * are logged.
 *
 * @param {App} app
 * @returns {App}
 */
exports.Log = function (app, log, stamp) {
    log = log || console.log;
    stamp = stamp || function (message) {
        return new Date().toISOString() + " " + message;
    };
    return function (request, response) {
        var remoteHost =
            request.remoteHost + ":" +
            request.remotePort;
        var requestLine =
            request.method + " " +
            request.path + " " +
            "HTTP/" + request.version.join(".");
        log(stamp(
            remoteHost + " " +
            "-->     " +
            requestLine
        ));
        return Q.when(app(request, response), function (response) {
            if (response) {
                log(stamp(
                    remoteHost + " " +
                    "<== " +
                    response.status + " " +
                    requestLine + " " +
                    (response.headers["content-length"] || "-")
                ));
            } else {
                log(stamp(
                    remoteHost + " " +
                    "... " +
                    "... " +
                    requestLine + " (response undefined / presumed streaming)"
                ));
            }
            return response;
        }, function (reason) {
            log(stamp(
                remoteHost + " " +
                "!!!     " +
                requestLine + " " +
                (reason && reason.message || reason)
            ));
            return Q.reject(reason);
        });
    };
};

/**
 * Decorates a Q-JSGI application such that all responses have an
 * X-Response-Time header with the time between the request and the
 * response in milliseconds, not including any time needed to stream
 * the body to the client.
 *
 * @param {App} app
 * @returns {App}
 */
exports.Time = function (app) {
    return function (request, response) {
        var start = new Date();
        return Q.when(app(request, response), function (response) {
            var stop = new Date();
            if (response && response.headers) {
                response.headers["x-response-time"] = "" + (stop - start);
            }
            return response;
        });
    };
};

/**
 * Decorates a Q-JSGI application such that all responses have the
 * given additional headers.  These headers do not override the
 * application's given response headers.
 *
 * @param {Object} headers
 * @param {App} app decorated application.
 */
exports.Headers = function (app, headers) {
    return function (request, response) {
        return Q.when(app(request, response), function (response) {
            if (response && response.headers) {
                Object.keys(headers).forEach(function (key) {
                    if (!(key in response.headers)) {
                        response.headers[key] = headers[key];
                    }
                });
            }
            return response;
        });
    };
};

/**
 * Wraps a Q-JSGI application in a sequence of decorators.
 * @param {Array * Decorator} decorators
 * @param {App} app
 * @returns {App}
 */
exports.Decorators = function (decorators, app) {
    decorators.reversed().forEach(function (Middleware) {
        app = Middleware(app);
    });
    return app;
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
exports.Json = function (app, visitor, tabs) {
    return function (request, response) {
        return Q.when(app(request, response), function (object) {
            return exports.json(object, visitor, tabs);
        });
    };
};

/**
 * @param {Object} content data to serialize as JSON
 * @param {Function} visitor
 * @param {Number|String} tabs
 * @returns {Response}
 */
exports.json = function (content, visitor, tabs) {
    try {
        var json = JSON.stringify(content, visitor, tabs);
    } catch (exception) {
        return Q.reject(exception);
    }
    return exports.ok([json]);
};

/**
 */
exports.ParseQuery = function (app) {
    return function (request, response) {
        request.query = QS.parse(URL.parse(request.url).query || "");
        return app(request, response);
    };
};

/**
 * Wraps an app such that it expects to receive content
 * in the request body and passes that content as a string
 * to as the second argument to the wrapped JSGI app.
 *
 * @param {Function(Request, Object):Response} app
 * @returns {App}
 */
exports.ContentRequest = function (app) {
    return function (request, response) {
        return Q.when(request.body.read(), function (body) {
            return app(body, request, response);
        });
    };
};

/**
 * @param {Function(Request, Object):Response} app
 * @param {App} badRequest
 * @returns {App}
 */
exports.JsonRequest = function (app, badRequest) {
    if (!badRequest)
        badRequest = exports.badRequest;
    return exports.ContentRequest(function (content, request, response) {
        try {
            var object = JSON.parse(content);
        } catch (error) {
            return badRequest(request, error);
        }
        return app(object, request, response);
    });
};

/**
 * @param {Function(Request):Object}
 * @returns {App}
 */
exports.Inspect = function (app) {
    return exports.Method({"GET": function (request, response) {
        return Q.when(app(request, response), function (object) {
            return {
                "status": 200,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [inspect(object)]
            }
        });
    }});
};

/**
 * Creates a persistent session associated with the HTTP client's
 * cookie.  These sessions are intended to persist for the duration
 * that a user visits your site in the same browser.
 *
 * @param {Function(session):App} Session a function that creates a
 * new Q-JSGI application for each new session.
 * @returns {App}
 */
exports.CookieSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.generate();
            if (!Object.has(sessions, uuid))
                return uuid;
        }
    }
    return function (request, response) {
        var cookie = QS.parse(request.headers["cookie"], /[;,]/g);
        var sessionIds = cookie["session.id"];
        if (!Array.isArray(sessionIds))
            sessionIds = [sessionIds];
        sessionIds = sessionIds.filter(function (sessionId) {
            return Object.has(sessions, sessionId);
        });
        // verifying cookie
        if (/^\/~session\//.test(request.pathInfo)) {
            if (cookie["session.id"])
                return exports.TemporaryRedirect("../")(request, response);
            // TODO more flexible session error page
            return {
                "status": 404,
                "headers": {
                    "content-type": "text/plain"
                },
                "body": [
                    "Access requires cookies"
                ]
            }
        // session exists
        } else if (
            Object.has(cookie, "session.id") &&
            sessionIds.length
        ) {
            var session = sessions[sessionIds[0]];
            session.lastAccess = new Date();
            request.session = session;
            return session.route(request, response);
        // new session
        } else {
            var session = {
                "id": nextUuid(),
                "lastAccess": new Date()
            };
            sessions[session.id] = session;
            session.route = Session(session);
            var response = exports.TemporaryRedirect(request.scriptInfo + "~session/")(request, response);
            response.headers["set-cookie"] = Cookie.stringify(
                "session.id", session.id, {
                    "path": request.scriptInfo
                }
            );
            return response;
        }
    };
};

/**
 * A Q-JSGI application that creates a session associated with a
 * unique path.  These sessions are intended to persist for the
 * duration that a user remains in a single browser window.
 *
 * @param {Function(session):App} a function that creates a new Q-JSGI
 * application for each new session.  It receives an object with the
 * session's `id` and `lastAccess` `Date`.
 * @returns {App}
 */
exports.PathSession = function (Session) {
    var sessions = {};
    function nextUuid() {
        while (true) {
            var uuid = UUID.generate();
            if (!Object.has(sessions, uuid))
                return uuid;
        }
    }
    return function (request, response) {
        // TODO request.pathInfo and request.scriptInfo
        if (request.pathInfo == "/") {
            // new session
            var session = {
                "id": nextUuid(),
                "lastAccess": new Date()
            };
            sessions[session.id] = session;
            session.route = Session(session);
            return exports.Json(function (request, response) {
                return session;
            })(request, response);
        } else if (Object.has(sessions, request.pathInfo.slice(1))) {
            return Object.get(sessions, request.pathInfo.slice(1)).route(request, response);
        } else {
            return exports.responseForStatus(404, "Session does not exist");
        }
    };
};

/**
 * Returns the response of the first application that returns a
 * non-404 response status.
 *
 * @param {Array * App} apps a cascade of applications to try
 * successively until one of them returns a non-404 status.
 * @returns {App}
 */
exports.FirstFound = function (cascade) {
    return function (request, response) {
        var i = 0, ii = cascade.length;
        function next() {
            var response = cascade[i++](request, response);
            if (i < ii) {
                return Q.when(response, function (response) {
                    if (response.status === 404) {
                        return next();
                    } else {
                        return response;
                    }
                });
            } else {
                return response;
            }
        }
        return next();
    };
};

/**
 * {Object * String} a mapping of HTTP status codes to
 * their standard descriptions.
 */
// Every standard HTTP code mapped to the appropriate message.
// Stolen from Rack which stole from Mongrel
exports.HTTP_STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Found',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Timeout',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Request Range Not Satisfiable',
    417 : 'Expectation Failed',
    422 : 'Unprocessable Entity',
    423 : 'Locked',
    424 : 'Failed Dependency',
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Timeout',
    505 : 'HTTP Version Not Supported',
    507 : 'Insufficient Storage'
};

/**
 * {Object * Number} a mapping from HTTP status descriptions
 * to HTTP status codes.
 */
exports.HTTP_STATUS_MESSAGES = {};
for (var code in exports.HTTP_STATUS_CODES)
    exports.HTTP_STATUS_MESSAGES[exports.HTTP_STATUS_CODES[code]] = +code;

/**
 * Determines whether an HTTP response should have a
 * response body, based on its status code.
 * @param {Number} status
 * @returns whether the HTTP response for the given status
 * code has content.
 */
exports.STATUS_WITH_NO_ENTITY_BODY = function (status) {
    return (status >= 100 && status <= 199) ||
        status == 204 || status == 304;
};

/**
 * @param {Number} status
 * @returns {Function(Request) :Response} a JSGI app that returns
 * a plain text response with the given status code.
 */
exports.appForStatus = function (status) {
    return function (request) {
        return exports.responseForStatus(status, request.method + " " + request.path);
    };
};

/**
 * @param {Number} status an HTTP status code
 * @param {String} message (optional) a message to include
 * in the response body.
 * @returns a JSGI HTTP response object with the given status
 * code and message as its body, if the status supports
 * a body.
 */
exports.responseForStatus = function(status, optMessage) {
    if (exports.HTTP_STATUS_CODES[status] === undefined)
        throw "Unknown status code";

    var message = exports.HTTP_STATUS_CODES[status];

    if (optMessage)
        message += ": " + optMessage;

    var content = message + "\r\n";

    var response = {
        "status": status,
        "headers": {}
    };

    // RFC 2616, 10.2.5:
    // The 204 response MUST NOT include a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.3.5:
    // The 304 response MUST NOT contain a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    if (!exports.STATUS_WITH_NO_ENTITY_BODY(status)) {
        response.headers['content-length'] = content.length;
        response.headers['content-type'] = 'text/plain';
        response.body = [content];
    }

    return response;
};

/**
 * {App} an application that returns a 400 response.
 */
exports.badRequest = exports.appForStatus(400);
/**
 * {App} an application that returns a 404 response.
 */
exports.notFound = exports.appForStatus(404);
/**
 * {App} an application that returns a 405 response.
 */
exports.methodNotAllowed = exports.appForStatus(405);
/**
 * {App} an application that returns a 405 response.
 */
exports.noLanguage =
exports.notAcceptable = exports.appForStatus(406);

exports.Normalize = function (app) {
    return function (request, response) {
        var request = HTTP.normalizeRequest(request);
        return Q.when(app(request, response), function (response) {
            return HTTP.normalizeResponse(response);
        });
    };
};

exports.RedirectTrap = function (app, maxRedirects) {
    maxRedirects = maxRedirects || 20;
    return function (request, response) {
        var remaining = maxRedirects;
        var deferred = Q.defer();
        var self = this;
        var args = arguments;

        request = HTTP.normalizeRequest(request);

        // try redirect loop
        function next() {
            Q.fcall(function () {
                return app(request, response);
            })
            .then(function (response) {
                if (exports.isRedirect(response)) {
                    if (remaining--) {
                        request.url = response.headers.location;
                        next();
                    } else {
                        throw new Error("Maximum redirects.");
                    }
                } else {
                    deferred.resolve(response);
                }
            })
            .fail(deferred.reject)
        }
        next();

        return deferred.promise;
    };
};

exports.isRedirect = function (response) {
    return isRedirect[response.status] || false;
};

var isRedirect = {
    301: true,
    302: true,
    303: true,
    307: true
};

exports.CookieJar = function (app) {
    var hostCookies = {}; // to {} of pathCookies to [] of cookies
    return function (request) {

        var hosts = allHostsContaining(request.headers.host);

        var now = new Date();

        var requestCookies = concat(hosts.map(function (host) {

            // delete expired cookies
            for (var host in hostCookies) {
                var pathCookies = hostCookies[host];
                for (var path in pathCookies) {
                    var cookies = pathCookies[path];
                    for (var name in cookies) {
                        var cookie = cookies[name];
                        if (cookie.expires && cookie.expires > now) {
                            delete cookie[name];
                        }
                    }
                }
            }

            // collect applicable cookies
            return concat(
                Object.keys(hostCookies)
                .map(function (host) {
                    if (!hostContains(host, request.headers.host))
                        return [];
                    var pathCookies = hostCookies[host];
                    return concat(
                        Object.keys(pathCookies)
                        .map(function (path) {
                            if (!pathContains(path, request.path))
                                return [];
                            var cookies = pathCookies[path];
                            return (
                                Object.keys(cookies)
                                .map(function (name) {
                                    return cookies[name];
                                })
                                .filter(function (cookie) {
                                    return cookie.secure ?
                                        request.ssl :
                                        true;
                                })
                            );
                        })
                    )
                })
            );

        }));

        if (requestCookies.length) {
            request.headers["cookie"] = (
                requestCookies
                .map(function (cookie) {
                    return Cookie.stringify(
                        cookie.key,
                        cookie.value,
                        cookie
                    );
                })
                .join("; ")
            );
        }

        return Q.when(app.apply(this, arguments), function (response) {
            response.headers = response.headers || {};
            if (response.headers["set-cookie"]) {
                var requestHost = ipRe.test(request.headers.host) ?
                    request.headers.host :
                    "." + request.headers.host;
                // normalize to array
                if (!Array.isArray(response.headers["set-cookie"])) {
                    response.headers["set-cookie"] = [response.headers["set-cookie"]];
                }
                response.headers["set-cookie"].forEach(function (cookie) {
                    var date = response.headers["date"] ?
                        new Date(response.headers["date"]) :
                        new Date();
                    cookie = Cookie.parse(cookie, date);
                    // ignore illegal host
                    if (cookie.host && !hostContains(requestHost, cookie.host))
                        delete cookie.host;
                    var host = requestHost || cookie.host;
                    var path = cookie.path || "/";
                    var pathCookies = hostCookies[host] = hostCookies[host] || {};
                    var cookies = pathCookies[path] = pathCookies[path] || {};
                    cookies[cookie.key] = cookie;
                })
                delete response.headers["set-cookie"];
            }

            return response;
        });

    };
};

var ipRe = /^\d+\.\d+\.\d+\.\d+$/;

function allHostsContaining(content) {
    if (ipRe.test(content)) {
        return [content];
    } if (content === "localhost") {
        return [content];
    } else {
        var parts = content.split(".");
        var hosts = [];
        while (parts.length > 1) {
            hosts.push("." + parts.join("."));
            parts.shift();
        }
        return hosts;
    }
}

function hostContains(container, content) {
    if (ipRe.test(container) || ipRe.test(content)) {
        return container === content;
    } else if (/^\./.test(container)) {
        return (
            content.lastIndexOf(container) ===
            content.length - container.length
        ) || (
            container.slice(1) === content
        );
    } else {
        return container === content;
    }
};

function pathContains(container, content) {
    if (/^\/$/.test(container)) {
        return content.indexOf(container) === 0;
    } else {
        return (
            content === container ||
            content.indexOf(container + "/") === 0
        );
    }
}

function concat(arrays) {
    return [].concat.apply([], arrays);
}


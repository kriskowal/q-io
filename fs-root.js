
var Q = require("q");
var CommonFs = require("./fs-common");

module.exports = RootFs;
function RootFs(outer, root) {

    var inner = Object.create(CommonFs.prototype);

    inner.root = outer.root;
    inner.separator = outer.separator;
    inner.altSeparator = outer.altSeparator;
    inner.separatorsExpression = outer.separatorsExpression;

    function attenuate(path) {

        // the machinations of projecting a path inside a
        // subroot
        var actual;
        // if it's absolute, we want the path relative to
        // the root of the inner file system
        if (outer.isAbsolute(path)) {
            actual = outer.relativeFromDirectory(outer.root, path);
        } else {
            actual = path;
        }
        // we join the path onto the root of the inner file
        // system so that parent references from the root
        // return to the root, emulating standard unix
        // behavior
        actual = outer.join(outer.root, actual);
        // then we reconstruct the path relative to the
        // inner root
        actual = outer.relativeFromDirectory(outer.root, actual);
        // and rejoin it on the outer root
        actual = outer.join(root, actual);
        var IN = actual;
        // and find the corresponding real path
        return outer.canonical(actual)
        .then(function (actual) {
            return actual;
        }, function () {
            return actual;
        }).then(function (actual) {
            // and verify that the outer canonical path is
            // actually inside the inner canonical path, to
            // prevent break-outs
            if (outer.contains(root, actual)) {
                return {
                    "inner": outer.join(outer.root, outer.relativeFromDirectory(root, actual)),
                    "outer": actual
                };
            } else {
                var error = new Error("Can't find: " + JSON.stringify(path));
                delete error.stack;
                throw error;
            }
        });
    }

    function workingDirectory() {
        return outer.root;
    }

    inner.list = function (path) {
        return attenuate(path).then(function (path) {
            return outer.list(path.outer);
        }).then(null, function (reason) {
            throw new Error("Can't list " + JSON.stringify(path));
        });
    };

    inner.open = function (path, flags, charset) {
        return attenuate(path).then(function (path) {
            return outer.open(path.outer, flags, charset);
        }).then(null, function (reason) {
            throw new Error("Can't open " + JSON.stringify(path));
        });
    };

    inner.stat = function (path) {
        return attenuate(path).then(function (path) {
            return outer.stat(path.outer);
        }).then(null, function (reason) {
            throw new Error("Can't stat " + JSON.stringify(path));
        });
    };

    inner.statLink = function (path) {
        return attenuate(path).then(function (path) {
            return outer.statLink(path.outer);
        }).then(null, function (reason) {
            throw new Error("Can't statLink " + JSON.stringify(path));
        });
    };

    inner.canonical = function (path) {
        return attenuate(path).then(function (path) {
            return path.inner;
        }).then(null, function (reason) {
            throw new Error("Can't find canonical of " + JSON.stringify(path));
        });
    };

    inner.makeDirectory = function (path) {
        return attenuate(path).then(function (path) {
            return outer.makeDirectory(path.outer);
        }).then(null, function (error) {
            throw new Error("Can't make directory " + JSON.stringify(path));
        });
    };

    inner.removeDirectory = function (path) {
        return attenuate(path).then(function (path) {
            return outer.removeDirectory(path.outer);
        }).then(null, function (error) {
            throw new Error("Can't remove directory " + JSON.stringify(path));
        });
    };

    return outer.canonical(root).then(function (_root) {
        root = _root;
        return inner;
    });
}


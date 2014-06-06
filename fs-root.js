"use strict";

var Q = require("q");
var CommonFs = require("./fs-common");

module.exports = RootFs;
function RootFs(outer, root) {

    var inner = Object.create(CommonFs.prototype);

    inner.root = outer.root;
    inner.separator = outer.separator;
    inner.altSeparator = outer.altSeparator;
    inner.separatorsExpression = outer.separatorsExpression;

    var workingDirectory = inner.root;

    root = outer.canonical(root);

    function attenuate(innerPath) {

        return root.then(function (root) {

            // Construct an inner path that is relative to the emulated root
            innerPath = inner.absolute(innerPath);
            innerPath = inner.relativeFromDirectory(inner.root, innerPath);
            var outerPath = outer.join(root, innerPath);

            return outer.canonical(outerPath)
            .then(function (outerPath) {
                if (outer.contains(root, outerPath)) {
                    return {
                        "inner": innerPath,
                        "outer": outerPath
                    };
                } else {
                    var error = new Error("Can't find: " + JSON.stringify(path));
                    // XXX TODO delete error.stack;
                    throw error;
                }
            })
        })

    }

    inner.workingDirectory = function () {
        return inner.root;
    };

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

    inner.readLink = function (path) {
        return attenuate(path).then(function (path) {
            return outer.readLink(path.outer);
        }).then(null, function (reason) {
            throw new Error("Can't read link at " + JSON.stringify(path));
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

    return inner;
}


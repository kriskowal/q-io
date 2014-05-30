"use strict";

// Originally from Narwhal, with contributions from Kris Kowal and Tom Robinson

var Q = require("q");
var BaseFs = require("./fs-base");

module.exports = CommonFs;
function CommonFs() {
}

CommonFs.prototype = Object.create(BaseFs.prototype);

/**
 * Read a complete file.
 * @param {String} path    Path to the file.
 * @param {String} [options.flags]  The mode to open the file with.
 * @param {String} [options.charset]  The charset to open the file with.
 * @param {Object} [options]   An object with options.
 * second argument.
 * @returns {Promise.<String || Buffer>}
 */
CommonFs.prototype.read = function (path, flags, charset, options) {
    if (typeof flags === "object") {
        options = flags;
    } else if (typeof charset === "object") {
        options = charset;
        options.flags = flags;
    } else {
        options = options || {};
        options.flags = flags;
        options.charset = charset;
    }
    options.flags = options.flags || "r";
    return this.open(path, options).then(function (stream) {
        return stream.read();
    }, function (cause) {
        var error = new Error("Can't read " + JSON.stringify(path) + " because " + cause.message);
        error.code = cause.code;
        error.cause = cause;
        error.path = path;
        error.flags = flags;
        error.charset = charset;
        throw error;
    });
};

/**
 * Write content to a file, overwriting the existing content.
 * @param {String} path    Path to the file.
 * @param {String || Buffer} content
 * @param {String} [options.flags]  The mode to open the file with.
 * @param {String} [options.charset]  The charset to open the file with.
 * @param {Object} [options]   An object with options.
 * @returns {Promise.<undefined>} a promise that resolves when the writing is
 * complete.
 */
CommonFs.prototype.write = function (path, content, flags, charset, options) {
    var self = this;
    if (typeof flags === "object") {
        options = flags;
    } else if (typeof charset === "object") {
        options = charset;
        options.flags = flags;
    } else {
        options = options || {};
        options.flags = flags;
        options.charset = charset;
    }
    flags = options.flags || "w";
    if (flags.indexOf("b") !== -1) {
        if (!(content instanceof Buffer)) {
            content = new Buffer(content);
        }
    } else if (content instanceof Buffer) {
        flags += "b";
    }
    options.flags = flags;
    return self.open(path, options).then(function (stream) {
        return stream.write(content).then(function () {
            return stream.close();
        });
    });
};

/**
 * Append content to the end of a file.
 * @param {String} path    Path to the file.
 * @param {String || Buffer} content
 * @param {String} [options.flags]  The mode to open the file with.
 * @param {String} [options.charset]  The charset to open the file with.
 * @param {Object} [options]   An object with options.
 * @returns {Promise * Undefined} a promise that resolves
 * when the writing is complete.
 */
CommonFs.prototype.append = function (path, content, flags, charset, options) {
    var self = this;
    if (typeof flags === "object") {
        options = flags;
    } else if (typeof charset === "object") {
        options = charset;
        options.flags = flags;
    } else {
        options = options || {};
        options.flags = flags;
        options.charset = charset;
    }
    flags = options.flags || "a";
    if (content instanceof Buffer) {
        flags += "b";
    }
    options.flags = flags;
    return self.open(path, options).then(function (stream) {
        return stream.write(content).then(function () {
            return stream.close();
        });
    });
};

CommonFs.prototype.move = function (source, target) {
    var self = this;
    return this.rename(source, target)
    .catch(function (error) {
        if (error.crossDevice) {
            return self.copyTree(source, target)
            .then(function () {
                return self.removeTree(source);
            });
        } else {
            throw error;
        }
    });
};

CommonFs.prototype.copy = function (source, target) {
    var self = this;
    return Q([
        self.open(source, {flags: "rb"}),
        self.open(target, {flags: "wb"})
    ]).spread(function (reader, writer) {
        return reader.forEach(function (block) {
            return writer.write(block);
        }).then(function () {
            return Q.all([
                reader.close(),
                writer.close()
            ]);
        });
    });
};

CommonFs.prototype.copyTree = function (source, target) {
    var self = this;
    return self.stat(source).then(function (stat) {
        if (stat.isFile()) {
            return self.copy(source, target);
        } else if (stat.isDirectory()) {
            return self.exists(target).then(function (targetExists) {
                var copySubTree = self.list(source).then(function (list) {
                    return Q.all(list.map(function (child) {
                        return self.copyTree(
                            self.join(source, child),
                            self.join(target, child)
                        );
                    }));
                });
                if (targetExists) {
                    return copySubTree;
                } else {
                    return self.makeDirectory(target).then(function () {
                        return copySubTree;
                    });
                }
            });
        } else if (stat.isSymbolicLink()) {
            // TODO copy the link and type with readPath (but what about
            // Windows junction type?)
            return self.symbolicCopy(source, target);
        }
    });
};

CommonFs.prototype.listTree = function (basePath, guard) {
    var self = this;
    basePath = String(basePath || "");
    if (!basePath) {
        basePath = ".";
    }
    guard = guard || function () {
        return true;
    };
    return self.stat(basePath).then(function (stat) {
        var paths = [];
        var mode; // true:include, false:exclude, null:no-recur
        var include = guard(basePath, stat);
        return Q(include).then(function (include) {
            if (include) {
                paths.push([basePath]);
            }
            if (include !== null && stat.isDirectory()) {
                return self.list(basePath).then(function (children) {
                    paths.push.apply(paths, children.map(function (child) {
                        var path = self.join(basePath, child);
                        return self.listTree(path, guard);
                    }));
                    return paths;
                });
            } else {
                return paths;
            }
        });
    }, function noSuchFile(error) {
        throw error; // XXX TODO REMOVE
        return [];
    }).then(Q.all).then(concat);
};

CommonFs.prototype.listDirectoryTree = function (path) {
    return this.listTree(path, function (path, stat) {
        return stat.isDirectory();
    });
};

CommonFs.prototype.makeTree = function (path, mode) {
    path = String(path);
    var self = this;
    var parts = self.split(path);
    var at = [];
    if (self.isAbsolute(path)) {
        // On Windows use the root drive (e.g. "C:"), on *nix the first
        // part is the falsey "", and so use the root ("/")
        at.push(parts.shift() || self.root);
    }
    return parts.reduce(function (parent, part) {
        return parent.then(function () {
            at.push(part);
            var parts = self.join(at) || ".";
            var made = self.makeDirectory(parts, mode);
            return Q.when(made, null, function rejected(error) {
                // throw away errors for already made directories
                if (error.exists) {
                    return;
                } else {
                    throw error;
                }
            });
        });
    }, Q());
};

CommonFs.prototype.removeTree = function (path) {
    var self = this;
    return self.statLink(path).then(function (stat) {
        if (stat.isSymbolicLink()) {
            return self.remove(path);
        } else if (stat.isDirectory()) {
            return self.list(path)
            .then(function (list) {
                // asynchronously remove every subtree
                return Q.all(list.map(function (name) {
                    return self.removeTree(self.join(path, name));
                }))
                .then(function () {
                    return self.removeDirectory(path);
                });
            });
        } else {
            return self.remove(path);
        }
    });
};

CommonFs.prototype.symbolicCopy = function (source, target, type) {
    var self = this;
    return self.relative(target, source).then(function (relative) {
        return self.symbolicLink(target, relative, type || "file");
    });
};

CommonFs.prototype.exists = function (path) {
    return this.stat(path).then(returnTrue, returnFalse);
};

CommonFs.prototype.isFile = function (path) {
    return this.stat(path).then(function (stat) {
        return stat.isFile();
    }, returnFalse);
};

CommonFs.prototype.isDirectory = function (path) {
    return this.stat(path).then(function (stat) {
        return stat.isDirectory();
    }, returnFalse);
};

CommonFs.prototype.isSymbolicLink = function (path) {
    return this.statLink(path).then(function (stat) {
        return stat.isSymbolicLink();
    }, returnFalse);
};

CommonFs.prototype.lastModified = function (path) {
    return this.stat(path).invoke("lastModified");
};

CommonFs.prototype.lastAccessed = function (path) {
    return this.stat(path).invoke("lastAccessed");
};

CommonFs.prototype.reroot = function (path) {
    var self = this;
    path = path || this.root;
    return require("./fs-root")(self, path);
}

CommonFs.prototype.toObject = function (path) {
    var self = this;
    return self.listTree(path || "", function (path, stat) {
        return stat.isFile();
    }).then(function (list) {
        var tree = {};
        return Q.all(list.map(function (path) {
            return self.read(path, "rb").then(function (content) {
                tree[path] = content;
            });
        })).then(function () {
            return tree;
        });
    });
};

CommonFs.prototype.merge = function (fss) {
    var tree = {};
    var done = Q();
    fss.forEach(function (fs) {
        done = done.then(function () {
            return fs.listTree("", function (path, stat) {
                return stat.isFile();
            })
            .then(function (list) {
                return Q.all(list.map(function (path) {
                    return Q.when(fs.read(path, "rb"), function (content) {
                        tree[path] = content;
                    });
                }));
            });
        });
    })
    return done.then(function () {
        return require("./fs-mock")(tree);
    });
};

CommonFs.prototype.mock = function (path) {
    return require("./fs-mock").mock(this, path);
};

function concat(arrays) {
    return Array.prototype.concat.apply([], arrays);
}

function returnTrue() {
    return true;
}

function returnFalse() {
    return false;
}


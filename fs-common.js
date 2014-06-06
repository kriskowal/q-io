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
        return stream.yield(content).then(function () {
            return stream.return();
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
        return stream.yield(content).then(function () {
            return stream.return();
        });
    });
};

// TODO support targetFs
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

CommonFs.prototype.copy = function (source, target, targetFs) {
    var sourceFs = this;
    targetFs = targetFs || sourceFs;
    return Q([
        sourceFs.open(source, {flags: "rb"}),
        targetFs.open(target, {flags: "wb"})
    ]).spread(function (reader, writer) {
        return reader.copy(writer);
    });
};

CommonFs.prototype.copyTree = function (source, target, targetFs) {
    var sourceFs = this;
    targetFs = targetFs || sourceFs;
    return sourceFs.statLink(source).then(function (stat) {
        if (stat.isFile()) {
            return sourceFs.copy(source, target, targetFs);
        } else if (stat.isDirectory()) {
            return sourceFs.exists(target).then(function (targetExists) {
                function copySubTree() {
                    return sourceFs.list(source).then(function (list) {
                        return Q.all(list.map(function (child) {
                            return sourceFs.copyTree(
                                sourceFs.join(source, child),
                                targetFs.join(target, child),
                                targetFs
                            );
                        }));
                    });
                }
                if (targetExists) {
                    return copySubTree();
                } else {
                    return targetFs.makeDirectory(target).then(copySubTree);
                }
            });
        } else if (stat.isSymbolicLink()) {
            // Convert symbolic links to relative links and replicate on the
            // target file system.
            return sourceFs.isDirectory(source)
            .then(function (isDirectory) {
                var relative, type;
                if (isDirectory) {
                    relative = sourceFs.relativeFromDirectory(source, target);
                    type = "directory";
                } else {
                    relative = sourceFs.relativeFromFile(source, target);
                    type = "file";
                }
                return targetFs.symbolicLink(target, relative, type);
            })
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

CommonFs.prototype.relative = function (source, target) {
    var self = this;
    return this.isDirectory(source).then(function (isDirectory) {
        if (isDirectory) {
            return self.relativeFromDirectory(source, target);
        } else {
            return self.relativeFromFile(source, target);
        }
    });
};

CommonFs.prototype.canonical = function (path) {
    var self = this;
    path = self.absolute(path);
    var input = self.split(path);
    return this._canonicalWalk(input, 1, this.root);
};

CommonFs.prototype._canonicalWalk = function (parts, index, via) {
    if (index >= parts.length) {
        return via;
    }
    var self = this;
    var path = self.join(via, parts[index]);
    return this.statLink(path)
    .then(function (stat) {
        if (stat.isSymbolicLink()) {
            return self.readLink(path)
            .then(function (relative) {
                var absolute = self.join(self.directory(path), relative);
                return self.canonical(absolute)
                .then(function (canonical) {
                    return self._canonicalWalk(parts, index + 1, canonical);
                });
            });
        } else {
            return self._canonicalWalk(parts, index + 1, self.join(via, parts[index]));
        }
    }, function (error) {
        return self.join(via, parts.slice(index).join(self.separator));
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
    var RootFs = require("./fs-root");
    return new RootFs(self, path);
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
                    return fs.read(path, "rb").then(function (content) {
                        tree[path] = content;
                    });
                }));
            });
        });
    })
    return done.then(function () {
        var MockFs = require("./fs-mock");
        return new MockFs(tree);
    });
};

CommonFs.prototype.mock = function (path) {
    var MockFs = require("./fs-mock");
    return MockFs.mock(this, path);
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


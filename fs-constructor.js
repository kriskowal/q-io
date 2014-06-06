"use strict";

var FS = require("fs");
var Q = require("q");
var CommonFs = require("./fs-common");
var Reader = require("./node/reader");
var Writer = require("./node/writer");

module.exports = NodeFs;
function NodeFs() {
}

NodeFs.prototype = Object.create(CommonFs.prototype);
NodeFs.prototype.constructor = NodeFs;

if (process.platform === "win32") {
    NodeFs.prototype.root = "\\";
    NodeFs.prototype.separator = "\\";
    NodeFs.prototype.altSeparator = "/";
    NodeFs.prototype.separatorsExpression = /[\\\/]/g;
} else {
    NodeFs.prototype.root = "/";
    NodeFs.prototype.separator = "/";
    NodeFs.prototype.separatorsExpression = /\//g;
}

NodeFs.prototype.workingDirectory = process.cwd;

// facilitates AIMD (additive increase, multiplicative decrease) for backing off
var backOffDelay = 0;
var backOffFactor = 1.0001;
function dampen(wrapped, thisp) {
    wrapped = Q(wrapped);
    var retry = function () {
        var args = arguments;
        var ready = Q();
        if (backOffDelay) {
            ready = ready.delay(backOffDelay);
        }
        return ready.then(function () {
            return wrapped.apply(thisp, args).then(function (stream) {
                backOffDelay = Math.max(0, backOffDelay - 1);
                return stream;
            }, function (error) {
                if (error.code === "EMFILE") {
                    backOffDelay = (backOffDelay + 1) * backOffFactor;
                    return retry.apply(null, args);
                } else {
                    throw error;
                }
            });
        });
    };
    return retry;
}

/**
 * @param {String} path
 * @param {Object} options (flags, mode, bufferSize, charset, begin, end)
 * @returns {Promise * Stream} a stream from the `q-io` module.
 */
NodeFs.prototype.open = dampen(function (path, flags, charset, options) {
    var self = this;
    if (typeof flags == "object") {
        options = flags;
        flags = options.flags;
        charset = options.charset;
    }
    options = options || {};
    flags = flags || "r";
    var nodeFlags = flags.replace(/b/g, "") || "r";
    var nodeOptions = {
        "flags": nodeFlags
    };
    if ("bufferSize" in options) {
        nodeOptions.bufferSize = options.bufferSize;
    }
    if ("mode" in options) {
        nodeOptions.mode = options.mode;
    }
    if ("begin" in options) {
        nodeOptions.start = options.begin;
        nodeOptions.end = options.end - 1;
    }
    if (flags.indexOf("b") >= 0) {
        if (charset) {
            throw new Error("Can't open a binary file with a charset: " + charset);
        }
    } else {
        charset = charset || 'utf-8';
    }
    if (flags.indexOf("w") >= 0 || flags.indexOf("a") >= 0) {
        var stream = FS.createWriteStream(String(path), nodeOptions);
        return Writer(stream, charset);
    } else {
        var stream = FS.createReadStream(String(path), nodeOptions);
        return Reader(stream, charset);
    }
});

NodeFs.prototype.remove = function (path) {
    path = String(path);
    var done = Q.defer();
    FS.unlink(path, function (error) {
        if (error) {
            error.message = "Can't remove " + JSON.stringify(path) + ": " + error.message;
            done.reject(error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
};

NodeFs.prototype.rename = function (source, target) {
    source = String(source);
    target = String(target);
    return Q.ninvoke(FS, "rename", source, target)
    .catch(function (error) {
        if (error.code === "EXDEV") {
            error.message = "source and target are on different devices: " + error.message;
            error.crossDevice = true;
        }
        error.message = (
            "Can't move " + JSON.stringify(source) + " to " +
            JSON.stringify(target) + " because " + error.message
        );
        throw error;
    });
};

NodeFs.prototype.makeDirectory = function (path, mode) {
    path = String(path);
    var done = Q.defer();
    if (typeof mode === "string") {
        mode = parseInt(mode, 8);
    } else if (mode === void 0) {
        mode = parseInt('755', 8);
    }
    FS.mkdir(path, mode, function (error) {
        if (error) {
            if (error.code === "EISDIR") {
                error.exists = true;
                error.isDirectory = true;
                error.message = "directory already exists: " + error.message;
            }
            if (error.code === "EEXIST") {
                error.exists = true;
                error.message = "file exists at that path: " + error.message;
            }
            error.message = "Can't makeDirectory " + JSON.stringify(path) + " with mode " + mode + ": " + error.message;
            done.reject(error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
};

NodeFs.prototype.removeDirectory = function (path) {
    path = String(path);
    var done = Q.defer();
    FS.rmdir(path, function (error) {
        if (error) {
            error.message = "Can't removeDirectory " + JSON.stringify(path) + ": " + error.message;
            done.reject(error);
        } else {
            done.resolve();
        }
    });
    return done.promise;
};

/**
 */
NodeFs.prototype.list = dampen(function (path) {
    path = String(path);
    var result = Q.defer();
    FS.readdir(path, function (error, list) {
        if (error) {
            error.message = "Can't list " + JSON.stringify(path) + ": " + error.message;
            return result.reject(error);
        } else {
            result.resolve(list);
        }
    });
    return result.promise;
});

/**
 * @param {String} path
 * @returns {Promise * Stat}
 */
NodeFs.prototype.stat = function (path) {
    var self = this;
    path = String(path);
    var done = Q.defer();
    try {
        FS.stat(path, function (error, stat) {
            if (error) {
                error.message = "Can't stat " + JSON.stringify(path) + ": " + error;
                done.reject(error);
            } else {
                done.resolve(new self.Stats(stat));
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.statLink = function (path) {
    path = String(path);
    var done = Q.defer();
    try {
        FS.lstat(path, function (error, stat) {
            if (error) {
                error.message = "Can't statLink " + JSON.stringify(path) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve(stat);
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.statFd = function (fd) {
    fd = Number(fd);
    var done = Q.defer();
    try {
        FS.fstat(fd, function (error, stat) {
            if (error) {
                error.message = "Can't statFd file descriptor " + JSON.stringify(fd) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve(stat);
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.link = function (source, target) {
    source = String(source);
    target = String(target);
    var done = Q.defer();
    try {
        FS.link(source, target, function (error) {
            if (error) {
                error.message = "Can't link " + JSON.stringify(source) + " to " + JSON.stringify(target) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

// this lookup table translates the link types that Q-IO accepts (which have
// been normalized to full words to be consistent with the naming convention)
var linkTypes = {
    "file": "file",
    "directory": "dir",
    "junction": "junction"
};

NodeFs.prototype.symbolicLink = function (target, relative, type) {
    if (!linkTypes.hasOwnProperty(type)) {
        console.warn(new Error("For Windows compatibility, symbolicLink must be called with a type argument \"file\", \"directory\", or \"junction\""));
    }
    type = linkTypes[type];
    target = String(target);
    relative = String(relative);
    var done = Q.defer();
    try {
        FS.symlink(relative, target, type || 'file', function (error) {
            if (error) {
                error.message = "Can't create symbolicLink " + JSON.stringify(target) + " to relative location " + JSON.stringify(relative) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.chown = function (path, uid, gid) {
    path = String(path);
    var done = Q.defer();
    try {
        FS.chown(path, uid, gid, function (error) {
            if (error) {
                error.message = "Can't chown (change owner) of " + JSON.stringify(path) + " to user " + JSON.stringify(uid) + " and group " + JSON.stringify(gid) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.chmod = function (path, mode) {
    path = String(path);
    mode = String(mode);
    var done = Q.defer();
    try {
        FS.chmod(path, mode, function (error) {
            if (error) {
                error.message = "Can't chmod (change permissions mode) of " + JSON.stringify(path) + " to (octal number) " + mode.toString(8) + ": " + error.message;
                done.reject(error);
            } else {
                done.resolve();
            }
        });
    } catch (error) {
        done.reject(error);
    }
    return done.promise;
};

NodeFs.prototype.readLink = function (path) {
    var result = Q.defer();
    FS.readlink(path, function (error, path) {
        if (error) {
            error.message = "Can't get link from " + JSON.stringify(path) + " by way of C readlink: " + error.message;
            result.reject(error);
        } else {
            result.resolve(path);
        }
    });
    return result.promise;
};

NodeFs.prototype.Stats = Stats;

function Stats(node) {
    this.node = node;
    this.size = node.size;
    this.hash = node.ino + "-" + node.size + "-" + node.mtime;
}

var stats = [
    "isDirectory",
    "isFile",
    "isBlockDevice",
    "isCharacterDevice",
    "isSymbolicLink",
    "isFIFO",
    "isSocket"
];

stats.forEach(function (name) {
    Stats.prototype[name] = function () {
        return this.node[name]();
    };
});

Stats.prototype.lastModified = function () {
    return new Date(this.node.mtime);
};

Stats.prototype.lastAccessed = function () {
    return new Date(this.node.atime);
};


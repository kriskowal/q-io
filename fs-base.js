"use strict";

// Originally from Narwhal, with contributions from Kris Kowal and Tom Robinson.
// These methods are common to all file system, regardless of whether they are
// synchronous or asynchronous, mostly consisting of path math.

// TODO function to return the Windows drive root
// TODO patternToRegExp
// TODO glob
// TODO match

module.exports = BaseFs;
function BaseFs() {
}

var regExpEscape = function (str) {
    return str.replace(/[-[\]{}()*+?.\\^$|,#\s]/g, "\\$&");
};

/**
 * separates a path into components.  If the path is
 * absolute, the first path component is the root of the
 * file system, indicated by an empty string on Unix, and a
 * drive letter followed by a colon on Windows.
 * @returns {Array * String}
 */
BaseFs.prototype.split = function (path) {
    var parts = String(path).split(this.separatorsExpression);
    // this special case helps isAbsolute
    // distinguish an empty path from an absolute path
    // "" -> [] NOT [""]
    if (parts.length === 1 && parts[0] === "")
        return [];
    // "a" -> ["a"]
    // "/a" -> ["", "a"]
    return parts;
};

BaseFs.prototype.rejoin = function (parts) {
    if (parts.length === 1 && parts[0] === "")
        return this.root;
    return parts.join(this.separator);
};

/**
 * Takes file system paths as variadic arguments and treats
 * each as a file or directory path and returns the path
 * arrived by traversing into the those paths.  All
 * arguments except for the last must be paths to
 * directories for the result to be meaningful.
 * @returns {String} path
 */
BaseFs.prototype.join = function () {
    if (arguments.length === 1 && Array.isArray(arguments[0]))
        return this.normal.apply(this, arguments[0]);
    return this.normal.apply(this, arguments);
};

/**
 * Takes file system paths as variadic arguments and treats
 * each path as a location, in the URL sense, resolving each
 * new location based on the previous.  For example, if the
 * first argument is the absolute path of a JSON file, and
 * the second argument is a path mentioned in that JSON
 * file, `resolve` returns the absolute path of the
 * mentioned file.
 * @returns {String} path
 */
BaseFs.prototype.resolve = function () {
    var root = "";
    var parents = [];
    var children = [];
    var leaf = "";
    for (var i = 0; i < arguments.length; i++) {
        var path = String(arguments[i]);
        if (path == "")
            continue;
        var parts = path.split(this.separatorsExpression);
        if (this.isAbsolute(path)) {
            root = parts.shift() + this.separator;
            parents = [];
            children = [];
        }
        leaf = parts.pop();
        if (leaf == "." || leaf == "..") {
            parts.push(leaf);
            leaf = "";
        }
        for (var j = 0; j < parts.length; j++) {
            var part = parts[j];
            if (part == "." || part == "") {
            } else if (part == "..") {
                if (children.length) {
                    children.pop();
                } else {
                    if (root) {
                    } else {
                        parents.push("..");
                    }
                }
            } else {
                children.push(part);
            }
        };
    }
    path = parents.concat(children).join(this.separator);
    if (path) leaf = this.separator + leaf;
    return root + path + leaf;
};

/**
 * Takes paths as any number of arguments and reduces them
 * into a single path in normal form, removing all "." path
 * components, and reducing ".." path components by removing
 * the previous path component if possible.
 * @returns {String} path
 */
BaseFs.prototype.normal = function () {
    var root = "";
    var parents = [];
    var children = [];
    for (var i = 0, ii = arguments.length; i < ii; i++) {
        var path = String(arguments[i]);
        // empty paths have no affect
        if (path === "")
            continue;
        var parts = path.split(this.separatorsExpression);
        if (this.isAbsolute(path)) {
            root = parts.shift() + this.separator;
            parents = [];
            children = [];
        }
        for (var j = 0, jj = parts.length; j < jj; j++) {
            var part = parts[j];
            if (part === "." || part === "") {
            } else if (part == "..") {
                if (children.length) {
                    children.pop();
                } else {
                    if (root) {
                    } else {
                        parents.push("..");
                    }
                }
            } else {
                children.push(part);
            }
        }
    }
    path = parents.concat(children).join(this.separator);
    return root + path;
};

/***
 * @returns {Boolean} whether the given path begins at the
 * root of the file system or a drive letter.
 */
BaseFs.prototype.isAbsolute = function (path) {
    // for absolute paths on any operating system,
    // the first path component always determines
    // whether it is relative or absolute.  On Unix,
    // it is empty, so ["", "foo"].join("/") == "/foo",
    // "/foo".split("/") == ["", "foo"].
    var parts = this.split(path);
    // split("") == [].  "" is not absolute.
    // split("/") == ["", ""] is absolute.
    // split(?) == [""] does not occur.
    if (parts.length == 0)
        return false;
    return this.isRoot(parts[0]);
};

/**
 * @returns {Boolean} whether the given path does not begin
 * at the root of the file system or a drive letter.
 */
BaseFs.prototype.isRelative = function (path) {
    return !this.isAbsolute(path);
};

/**
 * @returns {Boolean} whether the given path component
 * corresponds to the root of the file system or a drive
 * letter, as applicable.
 */
BaseFs.prototype.isRoot = function (first) {
    if (this.separator === "\\") {
        return /[a-zA-Z]:$/.test(first);
    } else {
        return first == "";
    }
};

/**
 * @returns {String} the parent directory of the given path.
 */
BaseFs.prototype.directory = function (path) {
    path = this.normal(path);
    var absolute = this.isAbsolute(path);
    var parts = this.split(path);
    // XXX needs to be sensitive to the root for
    // Windows compatibility
    if (parts.length) {
        if (parts[parts.length - 1] == "..") {
            parts.push("..");
        } else {
            parts.pop();
        }
    } else {
        parts.unshift("..");
    }
    return parts.join(this.separator) || (
        this.isRelative(path) ?
        "" : this.root
    );
};

BaseFs.prototype.absolute = function (path) {
    if (this.isAbsolute(path))
        return this.normal(path);
    return this.join(this.workingDirectory(), path);
};

BaseFs.prototype.relativeFromFile = function (source, target) {
    source = this.absolute(source);
    target = this.absolute(target);
    source = source.split(this.separatorsExpression);
    target = target.split(this.separatorsExpression);
    source.pop();
    while (
        source.length &&
        target.length &&
        target[0] == source[0]
    ) {
        source.shift();
        target.shift();
    }
    while (source.length) {
        source.shift();
        target.unshift("..");
    }
    return target.join(this.separator);
};

BaseFs.prototype.relativeFromDirectory = function (source, target) {
    if (!target) {
        target = source;
        source = this.workingDirectory();
    }
    source = this.absolute(source);
    target = this.absolute(target);
    source = source.split(this.separatorsExpression);
    target = target.split(this.separatorsExpression);
    if (source.length === 2 && source[1] === "")
        source.pop();
    while (
        source.length &&
        target.length &&
        target[0] == source[0]
    ) {
        source.shift();
        target.shift();
    }
    while (source.length) {
        source.shift();
        target.unshift("..");
    }
    return target.join(this.separator);
};

BaseFs.prototype.contains = function (parent, child) {
    parent = this.absolute(parent);
    child = this.absolute(child);
    parent = parent.split(this.separatorsExpression);
    child = child.split(this.separatorsExpression);
    if (parent.length === 2 && parent[1] === "")
        parent.pop();
    if (parent.length > child.length)
        return false;
    for (var index = 0; index < parent.length; index++) {
        if (parent[index] !== child[index])
            break;
    }
    return index === parent.length;
};

/**
 * @returns {String} the last component of a path, without
 * the given extension if the extension is provided and
 * matches the given file.
 * @param {String} path
 * @param {String} extention an optional extention to detect
 * and remove if it exists.
 */
BaseFs.prototype.name = // TODO document
BaseFs.prototype.base = function (path, extension) {
    var base = path.split(this.separatorsExpression).pop();
    if (extension)
        base = base.replace(
            new RegExp(regExpEscape(extension) + "$"),
            ""
        );
    return base;
};

/**
 * @returns {String} the extension (e.g., `txt`) of the file
 * at the given path.
 */
BaseFs.prototype.extension = function (path) {
    path = this.base(path);
    path = path.replace(/^\.*/, "");
    var index = path.lastIndexOf(".");
    return index <= 0 ? "" : path.substring(index);
};


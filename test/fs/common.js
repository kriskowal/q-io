"use strict";
/*jshint node:true */

var FS = require("../../fs");

exports['test relativeFromDirectory'] = function (ASSERT, done) {

    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a/b"), "", "same");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a/b"), "", "same, source trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a/b/"), "", "same, target trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a/b/"), "", "same, both trailing slash");

    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a/b/c"), "c", "child");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a/b/c"), "c", "child, source trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a/b/c/"), "c", "child, target trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a/b/c/"), "c", "child, both trailing slash");

    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a"), "..", "parent");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a"), "..", "parent, source trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b", "/a/"), "..", "parent, target trailing slash");
    ASSERT.equal(FS.relativeFromDirectory("/a/b/", "/a/"), "..", "parent, both trailing slash");

    done();
};

if (require.main === module) {
    require("test").run(exports);
}

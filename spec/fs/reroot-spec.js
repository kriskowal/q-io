var FS = require("../../fs");

require("../lib/jasmine-promise");

describe("reroot", function () {

    it("should still have makeDirectory()", function() {
		return FS.reroot("/")
		.then(function(fs) {
			expect(fs.makeTree instanceof Function).toBe(true);
			expect(fs.makeDirectory instanceof Function).toBe(true);
		});
    });

	it("should have a makeDirectory() that creates within the attenuated root", function() {
		var tmpdir = __dirname + '/tmp';
		return FS.removeTree(tmpdir)
		.then(function() {
			return FS.makeTree(tmpdir)
		}).then(function() {
			return FS.reroot(tmpdir);
		}).then(function(fs) {
			return fs.makeDirectory('/foo');
		}).then(function() {
			return FS.isDirectory(tmpdir + '/foo');
		}).then(function(isDir) {
			if (!isDir) return Q.reject();
		});
	});
});

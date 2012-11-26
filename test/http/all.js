
exports.testBasic = require("./basic");

if (module === require.main) {
    require("test").run(exports);
}


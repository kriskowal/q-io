
exports["test http"] = require("./http/all");
exports["test fs"] = require("./fs/all");
exports["test issue 1"] = require("./issues/1");

if (require.main === module) {
    require("test").run(exports);
}


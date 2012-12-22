
exports["test http"] = require("./http/all");
exports["test http apps"] = require("./http-apps/all");

if (require.main === module) {
    require("test").run(exports);
}


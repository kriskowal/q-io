
exports['test cookie'] = require("./cookie");
exports['test interpret range'] = require("./interpret-range");
exports['test partial range'] = require("./partial-range");
exports['test proxy'] = require("./proxy");

if (require.main = module)
    require("test").run(exports);


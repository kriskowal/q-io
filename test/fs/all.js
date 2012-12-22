'use strict'

exports['test mock/merge'] = require('./mock/merge');
exports['test mock/read'] = require('./mock/read');
exports['test mock/subtree'] = require('./mock/subtree');
exports['test mock/write'] = require('./mock/write');
exports['test mock/move'] = require('./mock/move');
exports['test mock/removeDirectory'] = require('./mock/remove-directory');
exports['test mock/copyTree'] = require('./mock/copy-tree');
exports['test mock/makeTree'] = require('./mock/make-tree');
exports['test mock/removeTree'] = require('./mock/remove-tree');
exports['test root mock'] = require('./root');
exports['test partial'] = require("./partial");
exports['test common'] = require("./common");


if (module == require.main)
    require('test').run(exports)


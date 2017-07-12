
const path = require('path');

const minimist = require('minimist');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');

const {BackendType} = require('./enum');
const dutyfreeBackend = require('./backend');
const routes = require('./routes');
const logger = require('./logger');

const STATIC_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function setup(options = {}) {
    const {
        staticMaxAge = STATIC_MAX_AGE, // Cache for 30 days by default
        backend = BackendType.FileSystem, // Can be either Number or Object / Class
        env = 'develop',
    } = options;
    process.env.NODE_ENV = env;
    const server = express();
    server.use(morgan(':user-agent - :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]'));
    server.use(cors());
    server.use(bodyParser.json({
        extended: true,
    }));
    server.use(compression({
        threshold: 0,
        filter: (req) => {
            return !req.headers['x-no-compress'];
        },
    }));
    server.use(dutyfreeBackend.init(backend));
    server.use(express.static(path.join(__dirname, '/pages'), {
        maxAge: staticMaxAge,
    }));
    server.use(express.static(path.join(__dirname, '/dist'), {
        maxAge: staticMaxAge,
    }));
    server.use(routes());
    return server;
}

module.exports = setup;

if (!module.parent) {
    // Somebody ran me from the CLI
    const {
        port = 80,
        host = '0.0.0.0',
        staticMaxAge = STATIC_MAX_AGE,
    } = minimist(process.argv.slice(2));
    const serverInstance = setup({
        staticMaxAge,
    });
    serverInstance.listen(port, host, () => {
        logger.info(`App server listening for connections on host ${host} via port ${port}`);
    });
}


const path = require('path');

const
    minimist = require('minimist'),
    express = require('express'),
    cors = require('cors'),
    compression = require('compression');

const routes = require('./routes');

const STATIC_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

function setup(options = {}) {
    const {
        staticMaxAge = STATIC_MAX_AGE, // Cache for 30 days by default
    } = options;
    const server = express();
    server.use(cors());
    server.use(compression({
        threshold: 0,
        filter: (req) => {
            return !req.headers['x-no-compress'];
        },
    }));
    server.use(routes());
    server.use(express.static(path.join(__dirname, '/pages'), {
        maxAge: staticMaxAge,
    }));
    server.use(express.static(path.join(__dirname, '/dist'), {
        maxAge: staticMaxAge,
    }));
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
        console.info(`App server listening for connections on host ${host} via port ${port}`); // eslint-disable-line
    });
}

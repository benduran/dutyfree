
const path = require('path');

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const compression = require('compression');

const dutyfreeBackend = require('./backend');
const routes = require('./routes');
const logger = require('./logger');

function setup(config = {}) {
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
  server.use(dutyfreeBackend.init(config.dutyfree));
  server.use(express.static(path.join(__dirname, '/pages'), {
    maxAge: config.server.cache.maxAge,
  }));
  server.use(express.static(path.join(__dirname, '/dist'), {
    maxAge: config.server.cache.maxAge,
  }));
  server.use(routes());
  const listener = server.listen(config.server.port, config.server.host, () => {
    logger.info(`Server is listening for connections on http://${listener.address().address}:${listener.address().port}`);
  });
  return server;
}

module.exports = setup;

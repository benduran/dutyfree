
const { Router } = require('express');

const webApp = require('./webApp');
const npm = require('./npm');

module.exports = function () {
  const router = new Router();
  webApp.bind(router);
  npm.bind(router);
  return router;
};

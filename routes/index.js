
const {Router} = require('express');

const pages = require('./pages');
const metadata = require('./metadata');

module.exports = function () {
    const router = new Router();
    pages.bind(router);
    metadata.bind(router);
    return router;
};

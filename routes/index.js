
const {Router} = require('express');

const metadata = require('./metadata');

module.exports = function () {
    const router = new Router();
    metadata.bind(router);
    return router;
};

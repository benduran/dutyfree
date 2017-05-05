
const {Router} = require('express');

const app = require('./app');
const npm = require('./npm');

module.exports = function () {
    const router = new Router();
    app.bind(router);
    npm.bind(router);
    return router;
};

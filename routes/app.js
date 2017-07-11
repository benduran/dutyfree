
const {packagesController} = require('./controllers');

exports.bind = function (router) {
    router
        .route('/api/packages/find')
        .get(packagesController.find);

    router
        .route('/api/packages/get/:name/:version?')
        .get(packagesController.get);
};

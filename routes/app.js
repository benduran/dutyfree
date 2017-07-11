
const {webAppController} = require('./controllers');

exports.bind = function (router) {
    router
        .route('/api/package/autocomplete')
        .get(webAppController.autocomplete);
};

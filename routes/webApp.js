
const { webApiController, webAppController } = require('./controllers');

exports.bind = function (router) {
  router
    .route('/api/packages/get/:name/:version?')
    .get(webApiController.get);

  router
    .route('/api/packages/find')
    .get(webApiController.find);

  router
    .route('/api/autocomplete/:query')
    .get(webAppController.autocomplete);

  // npmjs.org autocomplete API
  // https://ac.cnstrc.com/autocomplete/:query

  // npmjs.org package page API
  // https://www.npmjs.com/package/:packageName
};

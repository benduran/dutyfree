
const {userController, packageController} = require('./controllers');

// More specific routes need to come BEFORE less specific ones
exports.bind = function (router) {
    router
    .route('/:name/-/:name/:version.tgz')
    .get(packageController.getTarball);

    router
    .route('/:name/-/:file/-rev/:rev')
    .delete(packageController.unpublishTarball);

    router
    .route('/-/user/org.couchdb.user:*/*/*')
    .put(userController.updateUser);

    router
    .route('/-/user/org.couchdb.user:*')
    .get(userController.getUser)
    .put(userController.registerUser);

    router
    .route('/:name/:version?')
    .get(packageController.getPackage);

    router
    .route('/:name')
    .put(packageController.publish);

    router
    .route('/:name/-rev/:rev?')
    .put(packageController.unpublishSpecific)
    .delete(packageController.unpublishAll);
};

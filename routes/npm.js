
function publish(req, res) {
    res.send('publish');
}

function getTarball(req, res) {
    res.send('getting tarball...');
}

function getPackage(req, res) {
    res.send('getting package...');
}

function unpublishSpecific(req, res) {
    res.send('unpublish specific...');
}

function unpublishAll(req, res) {
    res.send('unpublish all...');
}

function unpublishTarball(req, res) {
    res.send('unpublish tarball...');
}

exports.bind = function (router) {
    router
    .route('/:name')
    .put(publish);

    router
    .route('/:name/-/:name/:version.tgz')
    .get(getTarball);

    router
    .route('/:name/:version?')
    .get(getPackage);

    router
    .route('/:name/-rev/:rev?')
    .put(unpublishSpecific)
    .delete(unpublishAll);

    router
    .route('/:name/-/:file/-rev/:rev')
    .delete(unpublishTarball);
};

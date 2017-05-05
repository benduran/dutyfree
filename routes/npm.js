
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

function getUser(req, res) {
    res.send('getting user...');
}

function updateUser(req, res) {
    res.send('updating user...');
}

async function registerUser(req, res) {
    const user = req.body || {};
    try {
        const userExists = await req.dutyfree.checkUserExists(user.name);
        if (userExists) {
            // 409, conflict
            res.status(409).json({
                error: 'conflict',
                reason: 'Document update conflict.',
            });
        }
        else {
            // We're good, let's add the user
            await req.dutyfree.createUser(user);
            res.status(201).json(user);
        }
    }
    catch (error) {
        res.status(500).json({error});
    }
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

    router
    .route('/-/user/org.couchdb.user:*')
    .get(getUser)
    .put(registerUser);

    router
    .route('/-/user/org.couchdb.user:*/*/*')
    .put(updateUser);
};

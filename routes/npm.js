
const {pick} = require('lodash');

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

async function getUser(req, res) {
    const {params} = req;
    // 0 param should be the user's name
    const name = params[0];
    const user = await req.dutyfree.getUser(name);
    if (!user) {
        res.status(404).end();
    }
    else {
        res.json(pick(user, ['name', 'email', 'date']));
    }
}

async function updateUser(req, res) {
    try {
        const {body: updatedUserObj} = req;
        const {params} = req;
        const name = params[0];
        const password = new Buffer(req.headers.authorization.split(' ')[1], 'base64').toString('utf8').split(':')[1];
        const authedUser = await req.dutyfree.authorizeUser(name, password);
        if (!authedUser) {
            res.status(401).end();
        }
        else {
            await req.dutyfree.updateUser(name, updatedUserObj);
            res.status(201).json(updatedUserObj);
        }
    }
    catch (error) {
        res.status(500).json({
            error: error.message || error,
        });
    }
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
        res.status(500).json({
            error: error.message || error,
        });
    }
}

// More specific routes need to come BEFORE less specific ones
exports.bind = function (router) {
    router
    .route('/:name/:version?')
    .get(getPackage);

    router
    .route('/:name/-/:name/:version.tgz')
    .get(getTarball);

    router
    .route('/:name')
    .put(publish);

    router
    .route('/:name/-rev/:rev?')
    .put(unpublishSpecific)
    .delete(unpublishAll);

    router
    .route('/:name/-/:file/-rev/:rev')
    .delete(unpublishTarball);

    router
    .route('/-/user/org.couchdb.user:*/*/*')
    .put(updateUser);

    router
    .route('/-/user/org.couchdb.user:*')
    .get(getUser)
    .put(registerUser);
};

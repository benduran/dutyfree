
const {pick} = require('lodash');

const logger = require('../logger');

function getRequestAuth(headers) {
    return new Buffer(headers.authorization.split(' ')[1], 'base64').toString('utf8').split(':')[1];
}

async function publish(req, res) {
    // TODO: Before allowing somebody to publish, we should check to see which packages they are *allowed* to actually publish
    try {
        // Check for package version collisions
        const reqPackageMetadata = req.body || {};
        const packageAndVersionExists = await req.dutyfree.getPackageVersion(reqPackageMetadata.name, reqPackageMetadata['dist-tags'].latest) !== null;
        if (packageAndVersionExists) {
            res.status(409).json({
                error: 'conflict',
                reason: 'Document update conflict.',
            });
        }
        else {
            // Continue with the publish
            const publishedMetadata = await req.dutyfree.publishPackage(reqPackageMetadata);
            res.status(201).json(publishedMetadata);
        }
    }
    catch (error) {
        res.status(500).json({
            error: error.message || error,
        });
        logger.error(error);
    }
}

function getTarball(req, res) {
    const {name, version} = req.params;
    const fileStream = req.dutyfree.getPackageStream(name, version);
    fileStream.once('data', () => {
        fileStream.pipe(res);
    });
    fileStream.once('finish', () => {
        res.end();
    });
}

async function getPackage(req, res) {
    const {name, version} = req.params;
    const packageMatch = await req.dutyfree.getPackagesForName(name);
    const encodedName = encodeURIComponent(name);
    if (packageMatch) {
        // If no version was specified in the route params, then we need to loop over every-single version and map a tarball URL
        if (!version) {
            Object.keys(packageMatch.versions).forEach((localVersion) => {
                packageMatch.versions[localVersion].dist.tarball = `${req.protocol}://${req.hostname}/${encodedName}/-/${encodedName}/${localVersion}.tgz`;
                if (!packageMatch.versions[localVersion]._id) {
                    packageMatch.versions[localVersion]._id = `${encodedName}@${localVersion}`;
                }
            });
        }
        else {
            packageMatch.versions[version].dist.tarball = `${req.protocol}://${req.hostname}/${encodedName}/-/${encodedName}/${version}.tgz`;
        }
        // We got a package version match
        // This query should hopefully return the URL to the tarball for the package
        res.status(200).json(packageMatch);
    }
    else {
        res.status(404).end();
    }
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
        const password = getRequestAuth(req.headers);
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
        logger.error(error);
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
        logger.error(error);
    }
}

// More specific routes need to come BEFORE less specific ones
exports.bind = function (router) {
    router
    .route('/:name/-/:name/:version.tgz')
    .get(getTarball);

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

    router
    .route('/:name/:version?')
    .get(getPackage);

    router
    .route('/:name')
    .put(publish);

    router
    .route('/:name/-rev/:rev?')
    .put(unpublishSpecific)
    .delete(unpublishAll);
};

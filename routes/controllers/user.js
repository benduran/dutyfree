
const {pick} = require('lodash');

const logger = require('../../logger');

function getRequestAuth(headers) {
    return new Buffer(headers.authorization.split(' ')[1], 'base64').toString('utf8').split(':')[1];
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

exports.getUser = getUser;
exports.updateUser = updateUser;
exports.registerUser = registerUser;

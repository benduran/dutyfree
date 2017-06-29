
const {omit} = require('lodash');

const logger = require('../../logger');


function _getPackageFilename(name, version) {
    return `${name}-${version}.tgz`;
}

async function publish(req, res) {
    // TODO: Before allowing somebody to publish, we should check to see which packages they are *allowed* to actually publish
    try {
        // Check for package version collisions
        const reqPackageMetadata = req.body || {};
        const packageAndVersionExists = await req.dutyfree.getPackageVersion(
            reqPackageMetadata.name,
            reqPackageMetadata['dist-tags'].latest,
        ) !== null;
        if (packageAndVersionExists) {
            res.status(409).json({
                error: 'conflict',
                reason: 'Document update conflict.',
            });
        }
        else {
            // Continue with the publish
            // Strip out the _id property
            const cleanMetadataToPublish = omit(reqPackageMetadata, ['_id', '_attachments']);
            const tarballNameToWrite = _getPackageFilename(cleanMetadataToPublish.name, cleanMetadataToPublish['dist-tags'].latest);
            const bufferToWrite = new Buffer(reqPackageMetadata._attachments[tarballNameToWrite].data, 'base64');
            await req.dutyfree.publishPackage(
                cleanMetadataToPublish.name,
                cleanMetadataToPublish['dist-tags'].latest,
                cleanMetadataToPublish,
                tarballNameToWrite,
                bufferToWrite,
            );
            res.status(201).json(cleanMetadataToPublish);
        }
    }
    catch (error) {
        res.status(500).json({
            error: error.message || error,
        });
        logger.error(error);
    }
}

async function getPackage(req, res) {
    const {name, version} = req.params;
    const packageMatch = await req.dutyfree.getPackageByName(name);
    if (packageMatch) {
        const encodedName = encodeURIComponent(name);
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

function unpublishSpecific(req, res) {
    res.send('unpublish specific...');
}

function unpublishAll(req, res) {
    res.send('unpublish all...');
}

function unpublishTarball(req, res) {
    res.send('unpublish tarball...');
}

exports.publish = publish;
exports.getTarball = getTarball;
exports.getPackage = getPackage;
exports.unpublishSpecific = unpublishSpecific;
exports.unpublishAll = unpublishAll;
exports.unpublishTarball = unpublishTarball;

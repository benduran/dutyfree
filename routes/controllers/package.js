
const {omit} = require('lodash');
const semver = require('semver');
const deepClone = require('clone');

const proxy = require('../../proxy');
const logger = require('../../logger');

function _getPackageFilename(name, version) {
    return `${name}-${version}.tgz`;
}

/**
 * Coalesces the current metadata available for a given package into the format required by NPM,
 * based on incoming metadata sent from NPM CLI. Modifies the reference to the object provided,
 * rather than returning a clone
 * @param {Object} currentMetadata - Current metadata for a given package
 * @param {Object} incomingMetadata - Metadata NPM is trying to set for a given package
 * @param {String} version - semver string for incoming package to update
 */
function _massageMetadata(packageName, currentMetadata, incomingMetadata, version) {
    const updatedMetadata = deepClone(currentMetadata, true);
    if (!updatedMetadata.versions) {
        updatedMetadata.versions = {};
        updatedMetadata._id = updatedMetadata.name = packageName; // eslint-disable-line
        updatedMetadata.description = incomingMetadata.description;
        updatedMetadata['dist-tags'] = {
            latest: version,
        };
        const created = new Date();
        updatedMetadata.time = {
            created: created.toISOString(),
        };
        updatedMetadata.contributors = incomingMetadata.contributors;
        updatedMetadata.license = incomingMetadata.license;
    }
    const now = new Date();
    updatedMetadata.time[version] = now.toISOString();
    updatedMetadata.time.modified = now.toISOString();
    updatedMetadata.versions[version] = incomingMetadata.versions[version];
    const maxVersion = Object.keys(updatedMetadata.versions).sort(semver.rcompare)[0];
    updatedMetadata['dist-tags'].latest = maxVersion;
    return updatedMetadata;
}

async function _unpublishAllPackagesForName(packageName, dutyfree) {
    const allAwait = [];
    const packageDetails = await dutyfree.getPackageByName(packageName);
    await dutyfree.unpublishPackageByName(packageName);
    const versions = Object.keys(packageDetails.versions);
    for (let i = 0; i < versions.length; i++) {
        allAwait.push(dutyfree.unpublishTarball(_getPackageFilename(packageName, versions[i])));
    }
    await Promise.all(allAwait);
}

async function publish(req, res) {
    // TODO: Before allowing somebody to publish, we should check to see which packages they are *allowed* to actually publish
    try {
        // Check for package version collisions
        const reqPackageMetadata = req.body || {};
        const existingPackageVersion = await req.dutyfree.getPackageVersion(
            reqPackageMetadata.name,
            reqPackageMetadata['dist-tags'].latest,
        );
        const packageAndVersionExists = typeof existingPackageVersion !== 'undefined' && existingPackageVersion !== null;
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
                _massageMetadata,
            );
            res.status(201).json(cleanMetadataToPublish);
        }
    }
    catch (error) {
        logger.error(error);
        res.status(500).json({
            error: error.message || error,
        });
    }
}

async function getPackage(req, res) {
    const {name, version} = req.params;
    try {
        let packageMatch = typeof version !== 'undefined' ?
            await req.dutyfree.getPackageByNameAndVersion(name, version) :
            await req.dutyfree.getPackageByName(name);
        if (!packageMatch) {
            // Try to proxy it through to public NPM registry to see if it exists there
            const response = await proxy({
                url: req.url,
                registryHost: 'registry.npmjs.org',
            });
            if (response.ok) {
                packageMatch = response.body;
            }
        }
        if (packageMatch) {
            const encodedName = encodeURIComponent(name);
            // If no version was specified in the route params, then we need to loop over every-single version and map a tarball URL
            if (!version) {
                Object.keys(packageMatch.versions).forEach((localVersion) => {
                    packageMatch.versions[localVersion].dist.tarball = `${req.protocol}://${req.hostname}/${encodedName}/-/${encodedName}-${localVersion}.tgz`;
                    if (!packageMatch.versions[localVersion]._id) {
                        packageMatch.versions[localVersion]._id = `${encodedName}@${localVersion}`;
                    }
                });
            }
            else if (packageMatch.versions) {
                packageMatch.versions[version].dist.tarball = `${req.protocol}://${req.hostname}/${encodedName}/-/${encodedName}-${version}.tgz`;
            }
            else {
                packageMatch.dist.tarball = `${req.protocol}://${req.hostname}/${encodedName}/-/${encodedName}-${version}.tgz`;
            }
            // We got a package version match
            // This query should hopefully return the URL to the tarball for the package
            res.status(200).json(packageMatch);
        }
        else {
            res.status(404).end();
        }
    }
    catch (error) {
        logger.error(error);
        res.status(500).json({
            error: error.message,
        });
    }
}

async function getTarball(req, res) {
    try {
        const {name, version} = req.params;
        let contents = await req.dutyfree.getTarball(_getPackageFilename(name, version));
        if (!contents) {
            // Proxy to another registry
            const response = await proxy({
                url: req.url,
                registryHost: 'registry.npmjs.org',
                parseResponse: false,
            });
            if (response.ok) {
                contents = response.body;
            }
        }
        if (contents) {
            contents.once('finish', () => {
                logger.info(`Finished piping ${name}@${version} package.`);
                res.end();
            });
            contents.pipe(res);
        }
        else {
            res.status(404).end();
        }
    }
    catch (error) {
        logger.error(error);
        res.status(500).json({
            error: error.message,
        });
    }
}

async function unpublishSpecific(req, res) {
    const {name, rev} = req.params;
    try {
        const versionToUnpublish = !rev || rev === 'undefined' ? null : rev;
        let unpublishedPackage = null;
        if (!versionToUnpublish) {
            // unpublish the whole thing
            await _unpublishAllPackagesForName(name, req.dutyfree);
            unpublishedPackage = true;
        }
        else {
            unpublishedPackage = await req.dutyfree.unpublishPackageByNameAndVersion(name, versionToUnpublish);
        }
        if (unpublishedPackage) {
            res.json({
                ok: 'updated package',
            });
        }
        else {
            // Package wasn't found to unpublish
            res.status(404);
        }
    }
    catch (error) {
        logger.error(error);
        res.status(500).json({
            error: error.message,
        });
    }
}

async function unpublishAll(req, res) {
    const {name} = req.params;
    try {
        await _unpublishAllPackagesForName(name, req.dutyfree);
        res.status(200).end();
    }
    catch (error) {
        logger.error(error);
        res.status(500).json({
            error: error.message,
        });
    }
}

function unpublishTarball(req, res) {
    const {name, file, rev} = req.params;
    const versionToUnpublish = !rev || rev === 'undefined' ? null : rev;
    let success = false;
    try {
        req.dutyfree.unpublishTarball(file);
        success = true;
    }
    catch (error) {} // eslint-disable-line
    if (!success) {
        try {
            req.dutyfree.unpublishTarball(_getPackageFilename(name, versionToUnpublish));
            success = true;
        }
        catch (error) {} // eslint-disable-line
    }
    if (success) {
        res.json({
            ok: 'file removed',
        });
    }
    else {
        res.status(404).end();
    }
}

exports.publish = publish;
exports.getTarball = getTarball;
exports.getPackage = getPackage;
exports.unpublishSpecific = unpublishSpecific;
exports.unpublishAll = unpublishAll;
exports.unpublishTarball = unpublishTarball;


const
    {BackendType} = require('../enum'),
    FileSystemBackend = require('./fileSystem'),
    AmazonS3Backend = require('./amazonS3');

let backendInstance = null; // Represents the singleton backend instance for the application

function middleware(req, res, next) {
    req.dutyfree = backendInstance;
    next();
}

/**
 * Initializes the type of backend needed for maintaining the NPM packages
 * Defaults to using the FS if nothing is provided.
 * @param {BackendType} backendType - Type of backend to use
 * @return {Function} Express middleware to inject backend into each request object
 */
exports.init = function (backend, options = {}) {
    if (typeof backend === 'object' && backend !== null) {
        // User provided a custom backend.
        // Let's use this instead.
        backendInstance = backend;
    }
    else {
        switch (backend) {
            case BackendType.AmazonS3:
                backendInstance = new AmazonS3Backend(options);
                break;
            case BackendType.FileSystem:
            default:
                backendInstance = new FileSystemBackend(options);
                break;
        }
    }
    return middleware;
};

exports.fileSystem = require('./fileSystem');
exports.amazonS3 = require('./amazonS3');

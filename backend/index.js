
const { BackendType } = require('../enum');
const FileSystemBackend = require('./fileSystem');
const AmazonS3Backend = require('./amazonS3');

/**
 * Initializes the type of backend needed for maintaining the NPM packages
 * Defaults to using the FS if nothing is provided.
 * @param {BackendType} backendType - Type of backend to use
 * @return {Function} Express middleware to inject backend into each request object
 */
exports.init = function (backendType, options = {}) {
  let backendInstance = null;
  if (typeof backendType === 'object' && backendType !== null) {
    // User provided a custom backend.
    // Let's use this instead.
    backendInstance = backendType;
  } else {
    switch (backendType) {
      case BackendType.AmazonS3:
        backendInstance = new AmazonS3Backend(options);
        break;
      case BackendType.FileSystem:
      default:
        backendInstance = new FileSystemBackend(options);
        break;
    }
  }
  return (req, res, next) => {
    req.dutyfree = backendInstance;
    next();
  };
};

exports.fileSystem = FileSystemBackend;
exports.amazonS3 = AmazonS3Backend;

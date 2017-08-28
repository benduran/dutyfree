
const { BackendType } = require('../enum');
const FileSystemBackend = require('./fileSystem');
const AmazonS3Backend = require('./amazonS3');

/**
 * Initializes the type of backend needed for maintaining the NPM packages
 * Defaults to using the FS if nothing is provided.
 * @param {Object} options
 * @param {String|BackendType} options.backend - Type of backend to use. Supports pointing to custom JS file or Class.
 * @returns {Function} Express middleware to inject backend into each request object
 */
exports.init = function (options = {}) {
  let backendInstance = null;
  if (typeof options.backend === 'object' && options.backend !== null) {
    // User provided a custom backend.
    // Let's use this instead.
    backendInstance = options.backend;
  } else {
    switch (options.backend) {
      case BackendType.AmazonS3:
        backendInstance = new AmazonS3Backend(options);
        break;
      case BackendType.FileSystem:
        backendInstance = new FileSystemBackend(options);
        break;
      default:
        // User provided a custom backend reference to a file
        backendInstance = require(options.backend); // eslint-disable-line
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

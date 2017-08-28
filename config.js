
const path = require('path');

const config = {
  env: 'staging',
  server: {
    port: 80,
    host: '0.0.0.0',
    cache: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days of caching for static files
    },
  },
  dutyfree: {
    backend: 'FileSystem',
    tarballDir: path.join(__dirname, '__tarballs'),
    usersPath: path.join(__dirname, '__data', 'users.json'),
    metadataPath: path.join(__dirname, '__data', 'metadata.json'),
    search: {
      maxResults: 100,
    },
    stale: 1000 * 60 * 5, // 5 minute timeout on metadatafiles before they should be read back-in from AWS.
  },
};

module.exports = config;

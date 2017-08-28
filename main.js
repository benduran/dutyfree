
const program = require('commander');
const extend = require('deep-extend');

const { version } = require('./package.json');
const config = require('./config');
const logger = require('./logger');
const server = require('./server');

process.on('uncaughtException', (error) => {
  logger.error(error);
});


// this.metadataPath = options.metadataPath || DEFAULT_METADATA_PATH;
// this.usersPath = options.usersPath || DEFAULT_USERS_PATH;
// this.tarballDir = options.tarballDir || DEFAULT_TARBALL_DIR;
// this.stale = options.stale || DEFAULT_STALE_AGE;
// this.maxPackageSearchResults = options.search.maxResults || 100;

function serve(options = {}) {
  const mappedConfig = extend({}, {
    env: options.env,
    server: {
      port: options.port,
      host: options.host,
      cache: {
        maxAge: options.maxAge,
      },
    },
    dutyfree: {
      backend: options.backend,
      stale: options.stale,
      metadataPath: options.metadataPath,
      usersPath: options.usersPath,
      tarballDir: options.tarballDir,
      search: {
        maxResults: options.maxResults,
      },
    },
  }, config);
  server(mappedConfig);
}

program
  .version(version)
  .description('DutyFree: A lightweight, private, locally-installable NPM registry.');

program
  .option('-p, --port [port]', 'Port on which dutyfree will listen for connections.', config.server.port)
  .option('-h, --host [host]', 'Hostname on which dutyfree will listen for connections.', config.server.host)
  .option('-m, --maxAge [maxAge]', 'Max static cache file age.', config.server.cache)
  .option('-e, --env [env]', 'Which environment flag to use when running dutyfree. Supports "staging" and "production."', config.env)
  .option('-b, --backend [backend]', 'Which backend to use when running dutyfree. Supports "FileSystem," "AmazonS3,", or path to custom JS file.', config.dutyfree.backend)
  .option('-m, --maxResults [maxResults]', 'How many package results to display, max, when searching from the UI.', config.dutyfree.search.maxResults)
  .option('-s, --stale [stale]', 'How long between reads of the metadata from the FileSystem or AmazonS3 backends.', config.dutyfree.stale)
  .option('--metadataPath [metadataPath]', 'Path to where package metadata JSON file is store in the FileSystem backend', config.dutyfree.metadataPath)
  .option('--tarballDir [tarballDir]', 'Path to where the tarballs are stored in the FileSystem backend', config.dutyfree.tarballDir)
  .option('--usersPath [usersPath]', 'Path to where users metadata JSON file is store in the FileSystem backend', config.dutyfree.usersPath)
  .command('serve')
  .description('Launches the dutyfree server.')
  .action(serve);

if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}

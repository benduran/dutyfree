
const program = require('commander');

const { version } = require('./package.json');
const config = require('./config');
const logger = require('./logger');
const server = require('./server');

process.on('uncaughtException', (error) => {
  logger.error(error);
});

function serve(options = {}) {
  const mappedConfig = {
    env: options.env || config.env,
    server: {
      port: options.port || config.server.port,
      host: options.host || config.server.host,
      cache: {
        maxAge: typeof options.maxAge !== 'undefined' ? +options.maxMage : config.server.cache.maxAge,
      },
    },
    dutyfree: {
      backend: options.backend || config.dutyfree.backend,
      stale: options.stale || config.dutyfree.stale,
      metadataPath: options.metadataPath || config.dutyfree.metadataPath,
      usersPath: options.usersPath || config.dutyfree.usersPath,
      tarballDir: options.tarballDir || config.dutyfree.tarballDir,
      registry: {
        fallback: options.fallback || config.dutyfree.registry.fallback,
      },
      search: {
        maxResults: typeof options.maxResults !== 'undefined' ? +options.maxResults : config.dutyfree.search.maxResults,
      },
    },
  };
  server(mappedConfig);
}

program
  .version(version)
  .description('DutyFree: A lightweight, private, locally-installable NPM registry.');

program
  .command('serve')
  .option('-p, --port [port]', 'Port on which dutyfree will listen for connections.', config.server.port)
  .option('-h, --host [host]', 'Hostname on which dutyfree will listen for connections.', config.server.host)
  .option('-m, --maxAge [maxAge]', 'Max static cache file age.', config.server.cache)
  .option('-e, --env [env]', 'Which environment flag to use when running dutyfree. Supports "staging" and "production."', config.env)
  .option('-b, --backend [backend]', 'Which backend to use when running dutyfree. Supports "FileSystem," "AmazonS3,", or path to custom JS file.', config.dutyfree.backend)
  .option('-f, --fallback [fallback]', 'If package is not found on this server, will proxy request through to another registry.', config.dutyfree.registry.fallback)
  .option('-m, --maxResults [maxResults]', 'How many package results to display, max, when searching from the UI.', config.dutyfree.search.maxResults)
  .option('-s, --stale [stale]', 'How long between reads of the metadata from the FileSystem or AmazonS3 backends.', config.dutyfree.stale)
  .option('--metadataPath [metadataPath]', 'Path to where package metadata JSON file is store in the FileSystem backend', config.dutyfree.metadataPath)
  .option('--tarballDir [tarballDir]', 'Path to where the tarballs are stored in the FileSystem backend', config.dutyfree.tarballDir)
  .option('--usersPath [usersPath]', 'Path to where users metadata JSON file is store in the FileSystem backend', config.dutyfree.usersPath)
  .description('Launches the dutyfree server.')
  .action(serve);

if (process.argv.length < 3) {
  program.help();
} else {
  program.parse(process.argv);
}

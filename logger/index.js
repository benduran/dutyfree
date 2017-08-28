
const { Logger, transports } = require('winston');

const instance = new Logger({
  transports: [
    new transports.Console({
      handleExceptions: true,
      humanReadableUnhandledException: true,
      colorize: true,
    }),
  ],
  exitOnError: false,
});

module.exports = instance;

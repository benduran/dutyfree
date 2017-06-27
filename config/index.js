
const config = {
    logging: {
        production: {
            s3Bucket: 'jplunpmstaging',
            logFile: 'dutyfree.log',
            region: 'us-gov-west-1',
        },
        staging: {
            s3Bucket: 'jplunpmstaging',
            logFile: 'dutyfree.log',
            region: 'us-gov-west-1',
        },
        develop: {
            s3Bucket: 'jplunpmstaging',
            logFile: 'dutyfree.log',
            region: 'us-gov-west-1',
        },
    },
};

module.exports = config;

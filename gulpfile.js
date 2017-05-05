/* eslint-disable no-console */

const {spawn} = require('child_process');

const
    gulp = require('gulp'),
    chalk = require('chalk');

const npmCmd = /win32/i.test(process.platform) ? 'npm.cmd' : 'npm';

let serverProcess = null,
    webpackProcess = null;

function launchServer() {
    return new Promise((resolve, reject) => {
        try {
            if (serverProcess) {
                serverProcess.kill();
            }
            const buf = new Buffer(chalk.yellow('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n'));
            serverProcess = spawn('node', [
                './index.js',
            ]);
            serverProcess.stdout.once('data', () => {
                resolve();
                console.log(chalk.yellow('App server process started and listening...'));
            });
            serverProcess.stdout.on('data', (data) => {
                process.stdout.write(buf + data + buf);
            });
            serverProcess.stderr.on('data', (data) => {
                process.stderr.write(buf + data + buf);
            });
        }
        catch (error) {
            reject(error);
        }
    });
}

gulp.task('devserver', () => {
    return new Promise((resolve, reject) => {
        try {
            if (webpackProcess) {
                webpackProcess.kill();
            }
            const buf = new Buffer(chalk.green('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n'));
            webpackProcess = spawn(npmCmd, [
                'run',
                'webpack-dev-server',
            ]);
            webpackProcess.stdout.once('data', () => {
                resolve();
                console.log(chalk.green('Webpack dev server process started and listening...'));
            });
            webpackProcess.stdout.on('data', (data) => {
                process.stdout.write(buf + data + buf);
            });
        }
        catch (error) {
            reject(error);
        }
    });
});

gulp.task('launchserver', () => {
    return launchServer();
});

gulp.task('watch', () => {
    return new Promise((resolve) => {
        gulp.watch([
            './index.js',
            './routes/**/**',
        ], () => {
            return launchServer();
        });
        resolve();
    });
});

gulp.task('build:client', () => {
    return new Promise((resolve, reject) => {
        try {
            if (webpackProcess) {
                webpackProcess.kill();
            }
            webpackProcess = spawn(npmCmd, [
                'run',
                'webpack',
            ], {
                stdio: 'inherit',
            });
        }
        catch (error) {
            reject(error);
        }
    });
});

gulp.task('default', ['build:client']);
gulp.task('build:launch', ['default', 'launchserver']);
gulp.task('dev', ['devserver', 'launchserver', 'watch']);
gulp.task('watchserver', ['launchserver', 'watch']);


const path = require('path');

const fs = require('fs-extra');

const {encryptString} = require('../utils');

const DEFAULT_MAX_AGE = 1000 * 60 * 5; // Cache for 5 minutes
const DEFAULT_USERS_PATH = path.join(__dirname, '../__data/users.json');
const DEFAULT_METADATA_PATH = path.join(__dirname, '../__data/metadata.json');
const DEFAULT_TARBALL_DIR = path.join(__dirname, '../__tarballs');

class FileSystemBackend {
    constructor(options = {}) {
        this.metadataPath = options.metadataPath || DEFAULT_METADATA_PATH;
        this.usersPath = options.usersPath || DEFAULT_USERS_PATH;
        this.tarballDir = options.tarballDir || DEFAULT_TARBALL_DIR;
        this.maxAge = options.maxAge || DEFAULT_MAX_AGE;

        this._users = null;
        this._lastUsersAccessTime = null;

        this._metadata = null;
        this._lastMetadataAccessTime = null;
    }
    _readFile(filePath, isJSON = true) {
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (exists) => {
                if (!exists) {
                    resolve(null);
                }
                else {
                    fs.readFile(filePath, 'utf8', (error, contents) => {
                        if (error) {
                            reject(error);
                        }
                        else if (isJSON) {
                            resolve(JSON.parse(contents));
                        }
                        else {
                            resolve(contents);
                        }
                    });
                }
            });
        });
    }
    _writeFile(filePath, contents, encoding = null) {
        return new Promise((resolve, reject) => {
            fs.ensureFile(filePath, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    fs.writeFile(filePath, contents, encoding, (error2) => {
                        if (error2) {
                            reject(error2);
                        }
                        else {
                            resolve();
                        }
                    });
                }
            });
        });
    }
    async syncUsers() {
        if (!this._lastUsersAccessTime || Date.now() - this._lastUsersAccessTime > this.maxAge) {
            this._users = await this._readFile(this.usersPath) || [];
            this._lastUsersAccessTime = Date.now();
        }
    }
    async getUser(name) {
        await this.syncUsers();
        if (this._users) {
            for (let i = 0; i < this._users.length; i++) {
                const u = this._users[i];
                if (u.name === name) {
                    return u;
                }
            }
        }
        return null;
    }
    async checkUserExists(name) {
        const user = await this.getUser(name);
        return user !== null;
    }
    async createUser(user) {
        await this.syncUsers();
        this._users = this._users.concat(Object.assign({}, user, {
            password: await encryptString(user.password),
        }));
        await this._writeFile(this.usersPath, JSON.stringify(this._users));
    }
}

module.exports = FileSystemBackend;

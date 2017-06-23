
const path = require('path');

const fs = require('fs-extra');

const {encryptString, verifyHash} = require('../utils');

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
    _readFile(filePath, isJSON = true, encoding = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (exists) => {
                if (!exists) {
                    resolve(null);
                }
                else {
                    fs.readFile(filePath, encoding, (error, contents) => {
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
    _getPackageFilename(name, version) {
        return `${name}-${version}.tgz`;
    }
    async syncMetadata() {
        if (!this._lastMetadataAccessTime || Date.now() - this._lastMetadataAccessTime > this.maxAge) {
            this._metadata = await this._readFile(this.metadataPath) || {};
            this._lastMetadataAccessTime = Date.now();
        }
    }
    async getPackagesForName(name) {
        await this.syncMetadata();
        return this._metadata[name];
    }
    async getPackageVersion(name, version) {
        const packagesForName = await this.getPackagesForName(name);
        return packagesForName ? packagesForName.versions[version] || null : null;
    }
    async publishPackage(metadataToPublish) {
        // If the request has gotten this far, then conflicts were already checked and we can continue publishing
        await this.syncMetadata();
        const flushableMetadata = {};
        Object.keys(metadataToPublish).filter((key) => {
            return key !== '_attachments';
        }).forEach((prop) => {
            flushableMetadata[prop] = metadataToPublish[prop];
        });
        this._metadata[metadataToPublish.name] = flushableMetadata;
        await this._writeFile(this.metadataPath, JSON.stringify(this._metadata));
        const tarballNameToWrite = this._getPackageFilename(metadataToPublish.name, metadataToPublish['dist-tags'].latest);
        await this._writeFile(path.join(this.tarballDir, tarballNameToWrite),
            new Buffer(metadataToPublish._attachments[tarballNameToWrite].data, 'base64'));
        return flushableMetadata;
    }
    getPackageStream(name, version) {
        return fs.createReadStream(path.join(this.tarballDir, `${name}-${version}.tgz`));
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
        this._users = this._users.concat({
            name: user.name,
            email: user.email,
            password: await encryptString(user.password),
            date: user.date,
        });
        await this._writeFile(this.usersPath, JSON.stringify(this._users));
    }
    async updateUser(username, updateObj) {
        await this.syncUsers();
        const existingUser = await this.getUser(username);
        let existingUserIndex = null;
        for (let i = 0; i < this._users.length; i++) {
            const u = this._users[i];
            if (u.name === username) {
                existingUserIndex = i;
                break;
            }
        }
        if (existingUserIndex !== null) {
            this._users[existingUserIndex] = Object.assign({}, existingUser, updateObj);
            await this._writeFile(this.usersPath, JSON.stringify(this._users));
        }
    }
    async authorizeUser(username, password) {
        await this.syncUsers();
        const user = await this.getUser(username);
        if (!user) {
            return null;
        }
        const passGood = await verifyHash(password, user.password);
        return passGood ? user : null;
    }
}

module.exports = FileSystemBackend;

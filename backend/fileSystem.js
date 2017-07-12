
const path = require('path');

const
    fs = require('fs-extra'),
    semver = require('semver');

const {encryptString, verifyHash} = require('../utils').encryption;

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
    _unlinkFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.exists(filePath, (exists) => {
                if (exists) {
                    fs.remove(filePath, (error) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve();
                        }
                    });
                }
                else {
                    reject(new Error(`${filePath} does not exist. Cannot unlink.`));
                }
            });
        });
    }
    getTarballStream(tarballName) {
        return new Promise((resolve) => {
            const tarballPath = path.join(this.tarballDir, tarballName);
            fs.exists(tarballPath, (exists) => {
                if (exists) {
                    resolve(fs.createReadStream(tarballPath));
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    async _writeJSON(filePath, obj) {
        await this._writeFile(filePath, JSON.stringify(obj));
    }
    getTarball(tarballName) {
        return new Promise((resolve) => {
            const tarballPath = path.join(this.tarballDir, tarballName);
            fs.exists(tarballPath, (exists) => {
                if (exists) {
                    resolve(fs.createReadStream(tarballPath));
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    async syncMetadata() {
        if (!this._lastMetadataAccessTime || Date.now() - this._lastMetadataAccessTime > this.maxAge) {
            this._metadata = await this._readFile(this.metadataPath) || {};
            this._lastMetadataAccessTime = Date.now();
        }
    }
    async getPackageByName(packageName) {
        await this.syncMetadata();
        return this._metadata[packageName];
    }
    async getPackageByNameAndVersion(packageName, version) {
        const packageMatch = await this.getPackageByName(packageName);
        const versions = packageMatch ? packageMatch.versions || {} : {};
        return versions[version];
    }
    async searchForPackageByName(packageName) {
        const lowerPName = packageName.toLowerCase();
        await this.syncMetadata();
        return Object.keys(this._metadata).filter((key) => {
            return key.toLowerCase().startsWith(lowerPName);
        }).map((pName) => {
            const returnMe = {
                name: pName,
                description: this._metadata[pName].description,
                latest: this._metadata[pName]['dist-tags'].latest,
            };
            return returnMe;
        });
    }
    async getPackageVersion(packageName, version) {
        const match = await this.getPackageByName(packageName);
        return match ? match.versions[version] : null;
    }
    async publishPackage(packageName, version, metadata, tarballName, tarballBuffer) {
        await this.syncMetadata();
        const currentMetadata = this._metadata[packageName] || {};
        if (!currentMetadata.versions) {
            currentMetadata.versions = {};
            currentMetadata._id = currentMetadata.name = packageName; // eslint-disable-line
            currentMetadata.description = metadata.description;
            currentMetadata['dist-tags'] = {
                latest: version,
            };
            const created = new Date();
            currentMetadata.time = {
                created: created.toISOString(),
            };
        }
        const now = new Date();
        currentMetadata.time[version] = now.toISOString();
        currentMetadata.time.modified = now.toISOString();
        currentMetadata.versions[version] = metadata.versions[version];
        this._metadata[packageName] = currentMetadata;
        const maxVersion = Object.keys(currentMetadata.versions).sort(semver.rcompare)[0];
        this._metadata[packageName]['dist-tags'].latest = maxVersion;
        await this._writeJSON(this.metadataPath, this._metadata);
        await this._writeFile(path.join(this.tarballDir, tarballName), tarballBuffer, 'base64');
    }
    unpublishPackageByName(packageName) {
        return new Promise((resolve, reject) => {
            this.getPackageByName(packageName).then((match) => {
                if (match) {
                    // Remove all the tarballs first
                    Promise.all(Object.keys(match.versions).map((version) => {
                        return new Promise((resolve2, reject2) => {
                            const filePathToRemove = path.join(this.tarballDir, `${packageName}-${version}.tgz`);
                            this._unlinkFile(filePathToRemove).then(resolve2).catch(reject2);
                        });
                    })).then(() => {
                        delete this._metadata[packageName];
                        this._writeJSON(this.metadataPath, this._metadata).then(() => {
                            resolve(true);
                        }).catch(reject);
                    }).catch(reject);
                }
                else {
                    resolve(false);
                }
            }).catch(reject);
        });
    }
    async unpublishPackageByNameAndVersion(packageName, version) {
        const match = await this.getPackageByName(packageName);
        if (match && match.versions && match.versions[version]) {
            const filePathToRemove = path.join(this.tarballDir, `${packageName}-${version}.tgz`);
            await this._unlinkFile(filePathToRemove);
            delete this._metadata[packageName].versions[version];
            await this._writeJSON(this.metadataPath, this._metadata);
            return true;
        }
        return false;
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

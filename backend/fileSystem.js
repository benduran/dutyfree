const path = require('path');

const fs = require('fs-extra');
const Fuse = require('fuse.js');

const {
  encryptString,
  verifyHash,
} = require('../utils').encryption;

class FileSystemBackend {
  constructor(options = {}) {
    this.metadataPath = options.metadataPath;
    this.usersPath = options.usersPath;
    this.tarballDir = options.tarballDir;
    this.stale = options.stale;
    this.maxPackageSearchResults = options.search.maxResults;

    this._users = null;
    this._lastUsersAccessTime = null;

    this._metadata = null;
    this._lastMetadataAccessTime = null;
    this._ensurePaths();
  }
  _ensurePaths() {
    if (this.metadataPath) {
      fs.ensureFileSync(this.metadataPath);
    }
    if (this.usersPath) {
      fs.ensureFileSync(this.usersPath);
    }
    if (this.tarballDir) {
      fs.ensureDirSync(this.tarballDir);
    }
  }
  _readFile(filePath, isJSON = true, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      fs.exists(filePath, (exists) => {
        if (!exists) {
          resolve(null);
        } else {
          fs.readFile(filePath, encoding, (error, contents) => {
            if (error) {
              reject(error);
            } else if (isJSON) {
              resolve(contents ? JSON.parse(contents) : null);
            } else {
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
        } else {
          fs.writeFile(filePath, contents, encoding, (error2) => {
            if (error2) {
              reject(error2);
            } else {
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
            } else {
              resolve();
            }
          });
        } else {
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
        } else {
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
        } else {
          resolve(null);
        }
      });
    });
  }
  async syncMetadata() {
    if (!this._lastMetadataAccessTime || Date.now() - this._lastMetadataAccessTime > this.stale) {
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
  async searchPackages(query, searchDescription = true) {
    // Retrieve listing of all packages
    await this.syncMetadata();
    // Flatten packages into array
    const packages = Object.keys(this._metadata).map(key => this._metadata[key]);
    const searchKeys = ['name'];
    if (searchDescription) {
      searchKeys.push('description');
    }
    const fuseOptions = {
      findAllMatches: true,
      shouldSort: true,
      threshold: 0.6, // Used to determine which weighted items get filtered out (anything below matches...0 is perfect, 1 is total mismatch)
      includeScore: true,
      distance: 1000, // How many character away from the "location" the text needs to be matched
      keys: searchKeys,
    };
    const f = new Fuse(packages, fuseOptions);
    return f.search(query);
  }
  async publishPackage(packageName, version, metadata, tarballName, tarballBuffer, massageMetadata) {
    await this.syncMetadata();
    const currentMetadata = this._metadata[packageName] || {};
    this._metadata[packageName] = massageMetadata(packageName, currentMetadata, metadata, version);
    await this._writeJSON(this.metadataPath, this._metadata);
    await this._writeFile(path.join(this.tarballDir, tarballName), tarballBuffer, 'base64');
  }
  async unpublishPackageByName(packageName) {
    const match = this.getPackageByName(packageName);
    if (match) {
      delete this._metadata[packageName];
      await this._writeJSON(this.metadataPath, this._metadata);
      return true;
    }
    return false;
  }
  async unpublishPackageByNameAndVersion(packageName, version) {
    const match = await this.getPackageByName(packageName);
    if (match && match.versions && match.versions[version]) {
      delete this._metadata[packageName].versions[version];
      await this._writeJSON(this.metadataPath, this._metadata);
      return true;
    }
    return false;
  }
  async unpublishTarball(filename) {
    await this._unlinkFile(path.join(this.tarballDir, filename));
  }
  async syncUsers() {
    if (!this._lastUsersAccessTime || Date.now() - this._lastUsersAccessTime > this.stale) {
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

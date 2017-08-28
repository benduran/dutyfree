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
  async searchPackages(properties) {
    // Retrieve listing of all packages
    await this.syncMetadata();
    const packages = Object.keys(this._metadata).map(key => this._metadata[key]);

    // Begin with all packages
    let result = packages;

    // Filter by search query
    if (
      typeof properties.query === 'string' &&
      properties.query.length > 0 &&
      properties.property.length > 0
    ) {
      // Set options for searching using sane magic numbers that shouldn't likely need customization
      const options = {
        threshold: 0.6,
        maxPatternLength: 32,
        shouldSort: true,
        keys: properties.property,
      };

      // If only searching for names, it's possible to more efficiently search the whole package array
      if (properties.property.length === 1 && properties.property[0] === 'name') {
        // Perform search for the query in the package array
        const fuse = new Fuse(packages, options);
        result = fuse.search(properties.query);
      }

      // If doing an advanced search with additional properties, make a new object of package properties
      else {
        // Extract searchable properties
        const searchProperties = packages.map((pack) => {
          // Get latest
          const latest = pack.versions[pack['dist-tags'].latest];

          // Return selected properties
          return {
            name: pack.name,
            description: latest.description || pack.description,
            author: latest._npmUser.name,
            readme: latest.readme || pack.readme,
            keywords: latest.keywords,
          };
        });

        // Perform search for the query in the package array
        const fuse = new Fuse(searchProperties, options);
        const searchResults = fuse.search(properties.query);

        // Translate searchable properties object back into the original packages
        result = searchResults.map((searchResult) => {
          for (let i = 0; i < result.length; i++) {
            if (searchResult.name === result[i].name) return result[i];
          }
          return null;
        });
      }
    }

    // Filter by author
    if (typeof properties.author === 'string' && properties.author.length > 0) {
      result = result.filter((pack) => {
        const latestVersionNumber = pack['dist-tags'].latest;
        const latest = pack.versions[latestVersionNumber];
        return latest._npmUser.name.toLowerCase() === properties.author.toLowerCase();
      });
    }

    // Sort by recent
    if (properties.sort === 'recent') {
      result = result.sort((a, b) => {
        const aLatestTime = a.time[a['dist-tags'].latest];
        const bLatestTime = b.time[b['dist-tags'].latest];

        return Date.parse(bLatestTime) - Date.parse(aLatestTime);
      });
    }

    // Sanitize the start value
    const startingValue = Math.max(properties.start || 0, 0);

    // Sanitize the amount value
    let resultsToReturn = Math.max(properties.amount || this.maxPackageSearchResults, 0);
    if (!resultsToReturn) resultsToReturn = this.maxPackageSearchResults;
    resultsToReturn = Math.min(resultsToReturn, this.maxPackageSearchResults);

    // Return the requested number of results capped at the program's overall limit
    return result.slice(startingValue, startingValue + resultsToReturn);
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

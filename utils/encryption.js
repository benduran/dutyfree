
const bcrypt = require('bcryptjs');

function getSalt(rounds = 10) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(rounds, (error, salt) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(salt);
            }
        });
    });
}

function getHash(str, salt) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(str, salt, (error, hash) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(hash);
            }
        });
    });
}

async function encryptString(str) {
    const salt = await getSalt();
    const hash = await getHash(str, salt);
    return hash;
}

function verifyHash(input, hash) {
    return new Promise((resolve, reject) => {
        if (!input) {
            reject(new Error('No input was provided when verifying hash.'));
        }
        else if (!hash) {
            reject(new Error('Saved hash is required when verifying hash.'));
        }
        else {
            bcrypt.compare(input, hash, (error, good) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(good);
                }
            });
        }
    });
}

exports.getSalt = getSalt;
exports.getHash = getHash;
exports.encryptString = encryptString;
exports.verifyHash = verifyHash;

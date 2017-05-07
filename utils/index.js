
const bcrypt = require('bcryptjs');

exports.getSalt = function (rounds = 10) {
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
};

exports.getHash = function (str, salt) {
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
};

exports.encryptString = async function (str) {
    const salt = await exports.getSalt();
    const hash = await exports.getHash(str, salt);
    return hash;
};

exports.verifyHash = function (input, hash) {
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
};

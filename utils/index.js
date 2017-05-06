
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

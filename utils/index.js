
const bcrypt = require('bcryptjs');

exports.encryptString = function (str) {
    return new Promise((resolve, reject) => {
        if (!str) {
            reject(new Error('No strin was provided to encrypt.'));
        }
        bcrypt.genSalt(10, (error, salt) => {
            if (error) {
                reject(error);
            }
            else {
                bcrypt.hash(str, salt, (error2, hash) => {
                    if (error2) {
                        reject(error2);
                    }
                    else {
                        resolve(hash);
                    }
                });
            }
        });
    });
};

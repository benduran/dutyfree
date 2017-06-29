
const fetch = require('node-fetch');

/**
 * Proxies requests through to another NPMJS-compatible registry
 * @param {Object} options
 * @param {String} options.url - Request URL to proxy outbound
 * @param {Boolean} options.secure - True to use HTTPS, false to use HTTP. Defaults to false.
 * @param {Boolean} options.parseResponse - True to attempt to parse the response to JSON or text. False to leave it alone.
 */
module.exports = async ({
    url,
    registryHost,
    // headers,
    secure = false,
    parseResponse = true,
}) => {
    if (!url) {
        throw new Error('No request url was provided when proxying to another npm registry.');
    }
    if (!registryHost) {
        throw new Error('No registryHost url was provided when proxying to another npm registry.');
    }
    const outboundUrl = `http${secure ? 's' : ''}://${registryHost}${url}`;
    const response = await fetch(outboundUrl, {
        method: 'GET',
    });
    let parsedResult = null;
    if (parseResponse) {
        try {
            parsedResult = await response.json();
        }
        catch (error) {
            parsedResult = await response.text();
        }
    }
    else {
        parsedResult = response.body;
    }
    // Return the parsed result from the server here
    return Object.assign({}, response, {
        body: parsedResult,
    });
};

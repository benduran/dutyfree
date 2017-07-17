
const {pick} = require('lodash');

async function find(req, res) {
    const properties = {
        query: req.query.query,
        property: req.query.property,
        author: req.query.author,
        sort: req.query.sort,
        start: req.query.start,
        amount: req.query.amount,
    };

    // Remove undefined properties
    Object.keys(properties).forEach((key) => {
        if (properties[key] === undefined) delete properties[key];
    });

    // Put a singular `property` into an array
    if (properties.property !== undefined && !Array.isArray(properties.property)) {
        properties.property = [properties.property];
    }

    // Reject invalid case
    if (
        properties.query === undefined &&
        properties.author === undefined &&
        properties.sort === undefined
    ) {
        res.status(400).json({
            error: 'packagename is a required query parameter.',
        });
        return;
    }

    const matches = await req.dutyfree.searchPackages(properties);

    res.json(matches);
}

async function get(req, res) {
    const pack = await req.dutyfree.getPackageByName(req.params.name);

    let version = req.params.version;
    if (version === undefined || pack.versions[version] === undefined) {
        version = pack['dist-tags'].latest;
    }

    const release = pack.versions[version];
    const latest = pack.versions[pack['dist-tags'].latest];

    const result = {
        name: pack.name,
        description: release.description,
        readme: release.readme,
        author: { name: release._npmUser.name, email: release._npmUser.email },
        collaborators: latest.maintainers.map((maintainer) => {
            return pick(maintainer, ['name', 'email']);
        }),
        versions: { version: Object.keys(pack.versions), time: pack.time[latest.version] },
        keywords: latest.keywords,
        dependencies: ['depA', 'depB', 'depC'],
    };

    if (latest.repository) {
        result.repo = latest.repository.url.match(/(https?:\/\/.*github.com\/.*\/.*).git/i)[1];
    }

    res.json(result);
}

exports.find = find;
exports.get = get;

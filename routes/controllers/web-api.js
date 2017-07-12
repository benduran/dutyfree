
async function find(req, res) {
    const {
        query,
        property,
        author,
        sort,
        start,
        amount,
    } = req.query;

    if (!query && !author && !sort) {
        res.status(400).json({
            error: 'packagename is a required query parameter.',
        });
        return;
    }

    // const matches = await req.dutyfree.searchForPackageByName(query);
    res.json({ query, property, author, sort, start, amount });
}

async function get(req, res) {
    const pack = await req.dutyfree.getPackageByName(req.params.name);

    let version = req.params.version;
    if (version === undefined || pack.versions[version] === undefined) {
        version = pack['dist-tags'].latest;
    }

    const release = pack.versions[version];
    const latest = pack.versions[pack['dist-tags'].latest];

    const maintainers = [];
    latest.maintainers.forEach((maintainer) => {
        maintainers.push({ name: maintainer.name, email: maintainer.email });
    });

    const result = {
        name: pack.name,
        description: release.description,
        readme: release.readme,
        author: { name: release._npmUser.name, email: release._npmUser.email },
        collaborators: maintainers,
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


const { pick } = require('lodash');

async function find(req, res) {
  try {
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
      if (properties[key] === undefined || properties[key] === '') delete properties[key];
    });

    // Put a singular `property` into an array
    if (!Array.isArray(properties.property)) {
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
  } catch (error) {
    res.status(500).json({
      error: 'invalid query string arguments.',
    });
  }
}

async function get(req, res) {
  try {
    const pack = await req.dutyfree.getPackageByName(req.params.name);
    if (!pack) {
      return res.status(404).json({
        error: `Package "${req.params.name}" does not exist.`,
      });
    }
    let version = req.params.version;
    if (version === undefined || pack.versions[version] === undefined) {
      version = pack['dist-tags'].latest;
    }

    const release = pack.versions[version];
    const latest = pack.versions[pack['dist-tags'].latest];

    const dependencies = [];
    Object.keys(latest.dependencies || {}).forEach((d) => {
      dependencies.push({
        dependency: d,
        version: latest.dependencies[d],
      });
    });

    const versions = [];
    Object.keys(pack.versions).forEach((v) => {
      versions.push({
        version: v,
        time: pack.time[v],
      });
    });


    const result = {
      name: pack.name,
      description: release.description,
      readme: release.readme,
      author: {
        name: release._npmUser.name,
        email: release._npmUser.email,
      },
      collaborators: latest.maintainers.map((maintainer) => {
        return pick(maintainer, ['name', 'email']);
      }),
      versions,
      dependencies,
    };

    if (latest.repository) {
      result.repo = latest.repository.url.match(/(https?:\/\/.*github.com\/.*\/.*).git/i)[1];
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: `Failure getting "${req.params.name}."`,
    });
  }
}

exports.find = find;
exports.get = get;

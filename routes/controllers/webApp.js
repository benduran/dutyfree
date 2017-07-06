
async function autocomplete(req, res) {
    const {packagename} = req.query;
    if (!packagename) {
        res.status(400).json({
            error: 'packagename is a required query parameter.',
        });
    }
    else {
        const matches = await req.dutyfree.searchForPackageByName(packagename);
        res.json({
            matches,
        });
    }
}

exports.autocomplete = autocomplete;

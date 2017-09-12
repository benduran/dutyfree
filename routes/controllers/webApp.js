
async function autocomplete(req, res) {
  const { query } = req.params;
  if (!query) {
    return res.status(400).json({
      error: 'No query was provided to autocomplete endpoint.',
    });
  }
  const results = await req.dutyfree.searchPackages(query);
  return res.json(results);
}

exports.autocomplete = autocomplete;

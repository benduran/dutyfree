module.exports = getTarball

function getTarball(respond, route, unpm) {
  var version = route.params.version
  var name = route.params.name
  var started = false
  var getTarballStream = unpm.Package.getTarball

  var tarballStream = null

  function doneFnc() {
    tarballStream.on('error', function(err) {
      if(started) {
        return unpm.log.error(err)
      }

      if(err.code === 'ENOTFOUND' || err.code === 'ENOENT' || err.notFound) {
        return notFound()
      }

      respond.onError()
    })

    tarballStream.once('data', function(data) {
      started = true
      tarballStream.pipe(respond.res).write(data)
    })

    function notFound() {
      return respond.notFound()
    }
  }
  // Use synchronous behavior for fetching tarball. We're assuming it's coming from disk
  tarballStream = getTarballStream(name, version)
  process.nextTick(doneFnc)
}

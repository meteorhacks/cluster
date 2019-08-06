Package.describe({
  "summary": "Clustering solution for Meteor with load balancing and service discovery.",
  "version": "1.6.9",
  "git": "https://github.com/meteorhacks/cluster.git",
  "name": "meteorhacks:cluster"
});

Npm.depends({
  "cookies": "0.5.0",
  "http-proxy": "1.8.1",
  "portscanner": "1.0.0",
  // Used an older version of Meteor's mongodb fork instead
  "mongodb": "https://github.com/meteor/node-mongodb-native/tarball/1.3.7-with-null-checks"
});

Package.onTest(function(api) {
  configurePackage(api);
  api.use('tinytest');
  api.use('practicalmeteor:sinon@1.10.3_2');

  api.addFiles([
    'tests/server/utils.js',
    'tests/server/api.js',
    'tests/server/worker_pool.js',
    'tests/server/discovery_backends/mongo/store.js',
    'tests/server/discovery_backends/mongo/discovery.js',
    'tests/server/balancer/utils.js',
    'tests/server/balancer/route.js',
    'tests/server/balancer/workers.js',
  ], 'server');
});

Package.onUse(function(api) {
  configurePackage(api);
  api.export('Cluster');
});

function configurePackage(api) {
  api.versionsFrom('METEOR@0.9.2');
  api.use(['webapp'], 'server');
  api.use([
    'ddp', 'underscore'
  ], ['server', 'client']);

  api.addFiles([
    'lib/namespace.js',
    'lib/connection_watcher.js',
  ], ['server', 'client']);

  api.addFiles([
    'lib/server/api.js',
    'lib/server/discovery_backends/mongo/store.js',
    'lib/server/discovery_backends/mongo/discovery.js',
    'lib/server/utils.js',
    'lib/server/worker_pool.js',
    'lib/server/balancer/namespace.js',
    'lib/server/balancer/utils.js',
    'lib/server/balancer/workers.js',
    'lib/server/balancer/route.js',
    'lib/server/auto_connect.js'
  ], ['server']);

  api.addFiles([
    'lib/client/api.js'
  ], ['client']);
}

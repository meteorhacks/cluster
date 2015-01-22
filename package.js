Package.describe({
  "summary": "Service Discovery Solution for Meteor Clusters",
  "version": "1.1.0",
  "git": "https://github.com/meteorhacks/meteor-collection-utils.git",
  "name": "meteorhacks:cluster-manager"
});

Npm.depends({
  "cookies": "0.5.0"
});

Package.onTest(function(api) {
  configurePackage(api);
  api.use('tinytest');

  api.addFiles([
    'tests/server/backends/mongo.js',
    'tests/server/backends/mongo_cursor.js'
  ], 'server');
});

Package.onUse(function(api) {
  configurePackage(api);
  api.export('ClusterManager');
});

function configurePackage(api) {
  api.versionsFrom('METEOR@0.9.2');
  api.use(['mongo-livedata', 'tracker', 'ddp'], ['server', 'client']);
  api.use('meteorhacks:picker@1.0.1', 'server');
  api.use('meteorhacks:inject-data@1.2.1')

  api.addFiles([
    'lib/namespace.js',
    'lib/proxy_connection.js'
  ], ['server', 'client']);

  api.addFiles([
    'lib/server/backends/mongo.js',
    'lib/server/backends/mongo_cursor.js',
    'lib/server/cursor.js',
    'lib/server/api.js',
    'lib/server/load_balancing.js'
  ], ['server']);

  api.addFiles([
    'lib/client/main_connection.js',
    'lib/client/cursor.js',
    'lib/client/api.js'
  ], ['client']);
}

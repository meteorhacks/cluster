Package.describe({
  "summary": "Service Discovery Solution for Meteor Clusters",
  "version": "1.1.0",
  "git": "https://github.com/meteorhacks/meteor-collection-utils.git",
  "name": "meteorhacks:cluster-manager"
});

Package.onUse(function(api) {
  configurePackage(api);
  api.export('ClusterManager');
});

function configurePackage(api) {
  api.versionsFrom('METEOR@0.9.2');
  api.use(['mongo-livedata', 'tracker', 'ddp'], ['server', 'client']);

  api.addFiles([
    'lib/namespace.js',
    'lib/proxy_connection.js'
  ], ['server', 'client']);

  api.addFiles([
    'lib/server/cursor.js',
    'lib/server/api.js'
  ], ['server']);

  api.addFiles([
    'lib/client/main_connection.js',
    'lib/client/cursor.js',
    'lib/client/api.js'
  ], ['client']);
}

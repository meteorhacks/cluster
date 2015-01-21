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

  api.addFiles('lib/namespace.js', ['server', 'client']);
  api.addFiles([
    'lib/proxy_connection.js',
    'lib/cursor.js',
    'lib/server.js'
  ], ['server']);

  api.addFiles([
    'lib/client.js'
  ], ['client']);
}

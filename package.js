Package.describe({
  "summary": "Service Discovery Solution for Meteor Clusters",
  "version": "1.1.0",
  "git": "https://github.com/meteorhacks/meteor-collection-utils.git",
  "name": "meteorhacks:cluster-manager"
});

Npm.depends({
  "cookies": "0.5.0",
  "http-proxy": "1.8.1"
});

Package.onTest(function(api) {
  configurePackage(api);
  api.use('tinytest');

  api.addFiles([
    'tests/server/discovery_backends/mongo/store.js',
  ], 'server');
});

Package.onUse(function(api) {
  configurePackage(api);
  api.export('ClusterManager');
});

function configurePackage(api) {
  api.versionsFrom('METEOR@0.9.2');
  api.use(['webapp'], 'server');
  api.use([
    'mongo-livedata', 'tracker', 'ddp', 'minimongo',
    'underscore'
  ], ['server', 'client']);
  api.use('meteorhacks:picker@1.0.1', 'server');
  api.use('meteorhacks:inject-data@1.2.1')

  api.addFiles([

  ], ['server', 'client']);

  api.addFiles([
    'lib/server/discovery_backends/mongo/store.js',
  ], ['server']);

  api.addFiles([

  ], ['client']);
}

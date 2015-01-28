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
  api.use('practicalmeteor:sinon@1.10.3_2');

  api.addFiles([
    'tests/server/utils.js',
    'tests/server/discovery_backends/mongo/store.js',
    'tests/server/discovery_backends/mongo/discovery.js',
    'tests/server/balancer_private.js',
    'tests/server/balancer_public.js',
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
    'mongo-livedata', 'tracker', 'ddp', 'minimongo',
    'underscore'
  ], ['server', 'client']);

  api.addFiles([
    'lib/namespace.js',
    'lib/proxy_connection.js',
  ], ['server', 'client']);

  api.addFiles([
    'lib/server/api.js',
    'lib/server/discovery_backends/mongo/store.js',
    'lib/server/discovery_backends/mongo/discovery.js',
    'lib/server/utils.js',
    'lib/server/balancer.js'
  ], ['server']);

  api.addFiles([
    'lib/client/api.js'
  ], ['client']);
}

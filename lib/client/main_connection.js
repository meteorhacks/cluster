ClusterManager.serviceStore = new Mongo.Collection('__cluster-manager');
ClusterManager.handleDefaultConnection = function(serviceName) {
  var currService = {};
  Tracker.autorun(function() {
    var service = ClusterManager.serviceStore.findOne(serviceName);
    if(service && currService.url !== service.url) {
      Meteor.disconnect();
      Meteor.reconnect({url: service.url});
      currService = service;
    }
  });
};
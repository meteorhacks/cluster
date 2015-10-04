Meteor.methods({
  'cluster_pickEndpoint': function(serviceName) {
    check(serviceName, String);
    return Cluster.discovery.pickEndpoint(serviceName);
  }
});

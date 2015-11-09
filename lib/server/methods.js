Meteor.methods({
  'cluster_pickEndpoint': function(serviceName) {
    check(serviceName, String);
    var endpoint = Cluster.discovery.pickEndpoint(serviceName);
    var endpointHash = Cluster.discovery.endpointToHash(endpoint);

    var balancer =
      Cluster.discovery.pickBalancer(endpointHash);

    if (balancer)
      return balancer;

    return endpoint;
  }
});

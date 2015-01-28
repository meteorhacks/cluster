Cluster.discoverConnection = function(serviceName) {
  return DDP.connect("/" + serviceName);
};
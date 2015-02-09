WithDiscovery = function WithDiscovery(newDiscovery, fn) {
  var oldDiscovery = Cluster.discovery;
  Cluster.discovery = newDiscovery;
  fn();
  Cluster.discovery = oldDiscovery;
};

WithCluster = function WithCluster(newFields, fn) {
  var original = _.clone(Cluster);
  Cluster = _.extend(Cluster, newFields);
  fn();
  Cluster = original;
};
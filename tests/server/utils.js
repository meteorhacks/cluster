WithDiscovery = function WithDiscovery(newDiscovery, fn) {
  var oldDiscovery = Cluster.discovery;
  Cluster.discovery = newDiscovery;
  fn();
  Cluster.discovery = oldDiscovery;
};
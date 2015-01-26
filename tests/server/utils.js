WithDiscovery = function WithDiscovery(newDiscovery, fn) {
  var oldDiscovery = ClusterManager.discovery;
  ClusterManager.discovery = newDiscovery;
  fn();
  ClusterManager.discovery = oldDiscovery;
};
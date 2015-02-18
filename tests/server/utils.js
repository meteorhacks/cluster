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

WithNew = function WithNew(original, newMethods, fn) {
  var originalMethods = _.clone(original);
  var newKeys = _.difference(_.keys(newMethods), _.keys(original));
  _.extend(original, newMethods);
  fn();

  _.extend(original, originalMethods);
  newKeys.forEach(function(key) {
    delete original[key];
  });
}
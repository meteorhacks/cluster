Cluster.discoverConnection = function discoverConnection(name, ddpOptions) {
  var options = {
    ddpOptions: ddpOptions
  };

  var watcher = new ConnectionWatcher(this.discovery, name, options);
  return watcher.getConnection();
};

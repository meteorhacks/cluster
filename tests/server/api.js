Tinytest.add("API - inside a worker - .register", function(test) {
  var newEnv = {CLUSTER_WORKER_ID: "232"};
  WithNew(process.env, newEnv, function() {
    var res = Cluster.register();
    test.isFalse(res);
  });
});

Tinytest.add("API - inside a worker - .allowPublicAccess", function(test) {
  var newEnv = {CLUSTER_WORKER_ID: "232"};
  WithNew(process.env, newEnv, function() {
    var res = Cluster.register();
    test.isFalse(res);
  });
});
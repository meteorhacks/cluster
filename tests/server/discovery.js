Tinytest.addAsync("Discovery - connect", function(test, done) {
  var backend = {connect: done};
  WithNewConnection(function() {
    Assert.isTrue(Discovery._backend === backend);
  }, "connUrl", backend);
});

Tinytest.add("Discovery - hashing", function(test) {
  var hashed = Discovery._hash("http://localhost/hello");
  test.isTrue(!!hashed);
});

Tinytest.add("Discovery - ping - with no options", function(test) {
  var pingInfo;
  var backend = {
    ping: function(key, payload) {
      pingInfo = {key: key, payload: payload};
    }
  };

  WithNewConnection(function() {
    Discovery._serviceName = "sname";
    Discovery._endpoint = "ep";

    Discovery._ping();
    Discovery._ping();
    Discovery._ping();

    test.isTrue(pingInfo.payload.timestamp.getTime() > 0);
  }, "connUrl", backend);
});

Tinytest.add("Discovery - ping - with sendAllInfo", function(test) {
  var doc;
  var backend = {
    ping: function(key, payload) {
      doc = _.extend(_.clone(key), _.clone(payload));
    }
  };

  WithNewConnection(function() {
    Discovery._serviceName = "sname";
    Discovery._endpoint = "ep";
    Discovery._endpointHash = "hash";
    Discovery._balancer = "balancer";

    Discovery._ping({sendAllInfo: true});

    var fieldsToPick = ["endpoint", "serviceName", "endpointHash", "balancer"];
    test.equal(_.pick(doc, fieldsToPick), {
      endpoint: "ep",
      serviceName: "sname",
      endpointHash: "hash",
      balancer: "balancer"
    });

    test.isTrue(doc.timestamp.getTime() > 0);
  }, "", backend);
});

Tinytest.add("Discovery - register - balancer url by option",
function(test) {
  WithNewConnection(function() {
    Discovery.register("hello", {
      balancer: "bUrl"
    });
    test.equal(Discovery._balancer, "bUrl");
  });
});

Tinytest.add("Discovery - register - endpoint url by option",
function(test) {
  WithNewConnection(function() {
    Discovery.register("hello", {
      endpoint: "bUrl"
    });
    test.equal(Discovery._endpoint, "bUrl");
  });
});

Tinytest.add("Discovery - register - endpoint url by balancer",
function(test) {
  WithNewConnection(function() {
    Discovery.register("hello", {
      balancer: "bUrl"
    });
    test.equal(Discovery._balancer, "bUrl");
    test.equal(Discovery._endpoint, "bUrl");
  });
});

Tinytest.add("Discovery - register - no endpoint url",
function(test) {
  WithNewConnection(function() {
    Discovery.register("hello", {
      endpoint: "bUrl"
    });
    test.equal(Discovery._endpoint, "bUrl");
  });

  WithNewConnection(function() {
    Discovery.register("hello");
    // if no balancer UI, then, server is not going to register
    test.equal(Discovery._endpoint, null);
  });
});

Tinytest.add("Discovery - register - pinging",
function(test) {
  var doc;
  var backend = {
    ping: function(key, payload) {
      doc = _.extend(_.clone(key), _.clone(payload));
    }
  };

  WithNewConnection(function() {
    Discovery.register("hello", {
      endpoint: "epoint",
      pingInterval: 50
    });
    Meteor._sleepForMs(60);

    var lastTimestamp = doc.timestamp.getTime();
    var nowTimestamp = Date.now();

    // if no balancer UI, then, server is not going to register
    test.isTrue(nowTimestamp > lastTimestamp);
  }, "", backend);
});

Tinytest.add("Discovery - _getEndpoint - without _selfWeight", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {endpoint: "ep", serviceName: "s"})
    Discovery._currentEndpoints.set(service._id, service);
    Meteor._sleepForMs(50);
    var service = Discovery._getEndpoint("s");
    test.equal(service.endpoint, "ep");
  });
});

Tinytest.add("Discovery - _getEndpoint - with _selfWeight", function(test) {
  WithNewConnection(function() {
    WithNew(Discovery, {_selfWeight: 0}, function() {
      WithNew(Cluster, {_endpoint: "ep"}, function() {
        var service = createNewService(Random.id(), {
          endpoint: "ep",
          endpointHash: Discovery._hash("ep"),
          serviceName: "s"
        });
        Discovery._currentEndpoints.set(service._id, service);

        var service2 = createNewService(Random.id(), {
          endpoint: "ep2",
          endpointHash: Discovery._hash("ep2"),
          serviceName: "s"
        });
        Discovery._currentEndpoints.set(service2._id, service2);

        Meteor._sleepForMs(50);
        for(var lc=0; lc<100; lc++) {
          var service = Discovery._getEndpoint("s");
          test.equal(service.endpoint, "ep2");
        }
      });
    });
  });
});

Tinytest.add("Discovery - pickEndpoint - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {endpoint: "ep", serviceName: "s"})
    Discovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var endpoint = Discovery.pickEndpoint("s");
    test.equal(endpoint, "ep");
  });
});

Tinytest.add("Discovery - pickEndpoint - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var endpoint = Discovery.pickEndpoint("s");
    test.equal(endpoint, undefined);
  });
});

Tinytest.add("Discovery - pickEndpointHash - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      endpointHash: "hash", serviceName: "s"
    });
    Discovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var hash = Discovery.pickEndpointHash("s");
    test.equal(hash, "hash");

    var oldHash = Discovery.pickEndpointHash("s");
    test.equal(hash, oldHash);
  });
});

Tinytest.add("Discovery - pickEndpointHash - doesn't exist",
function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);

    var hash = Discovery.pickEndpointHash("s");
    test.equal(hash, undefined);
  });
});

Tinytest.add("Discovery - hashToEndpoint - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      endpoint: "ep",
      endpointHash: "hash",
      serviceName: "s"
    });
    Discovery._endpointsColl.insert(service);

    Meteor._sleepForMs(50);
    var hash = Discovery.pickEndpointHash("s");
    test.equal(hash, "hash");

    var endpoint = Discovery.hashToEndpoint(hash);
    test.equal(endpoint, "ep");
  });
});

Tinytest.add("Discovery - hashToEndpoint - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var hash = Discovery.pickEndpointHash("s");
    test.equal(hash, undefined);
  });
});

Tinytest.add("Discovery - pickBalancer - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w"
    });
    Discovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var endpoint = Discovery.pickBalancer();
    test.equal(endpoint, "bUrl");
  });
});

Tinytest.add(
"Discovery - pickBalancer - given endpoint is a balancer",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    Discovery._endpointsColl.insert(service);

    var service2 = createNewService(Random.id(), {
      balancer: "bUrl2", service: "w", endpointHash: "e2"
    });
    Discovery._endpointsColl.insert(service2);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = Discovery.pickBalancer("e2");
      test.equal(endpoint, "bUrl2");
    }
  });
});

Tinytest.add(
"Discovery - pickBalancer - given endpoint is not a balancer",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    Discovery._endpointsColl.insert(service);

    var service2 = createNewService(Random.id(), {
      service: "w", endpointHash: "e2"
    });
    Discovery._endpointsColl.insert(service2);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = Discovery.pickBalancer("e2");
      test.equal(endpoint, "bUrl");
    }
  });
});

Tinytest.add(
"Discovery - pickBalancer - given endpoint doesn't exist",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    Discovery._endpointsColl.insert(service);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = Discovery.pickBalancer("e2-notexists");
      test.equal(endpoint, "bUrl");
    }
  });
});

Tinytest.add("Discovery - pickBalancer - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var endpoint = Discovery.pickBalancer();
    test.equal(endpoint, null);
  });
});

function WithNewConnection(fn, connUrl, backendFields) {
  connUrl = connUrl || "";
  backend = GetBackend(backendFields);

  Discovery.connect(connUrl, backend, Cluster, {});
  fn();
  Discovery.disconnect();
}

function createNewService(id, additional) {
  additional = additional || {};
  var service = {
    _id: id,
    timestamp: new Date(),
    pingInterval: 1000 * 10,
  };

  service = _.extend(service, additional);
  return service;
}

function GetBackend(fields) {
  var backend = {
    connect: function() {},
    ping: function() {},
    disconnect: function() {}
  };

  if(fields) {
    _.extend(backend, fields);
  }

  return backend;
}
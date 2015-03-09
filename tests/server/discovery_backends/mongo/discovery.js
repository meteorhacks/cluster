Tinytest.add("MongoDiscovery - connect", function(test) {
  WithNewConnection(function() {
    var cursor = MongoDiscovery._endpointsColl.find();
    var size = Meteor.wrapAsync(cursor.count, cursor)();
    test.equal(size, 0);
  });
});

Tinytest.add("MongoDiscovery - hashing", function(test) {
  var hashed = MongoDiscovery._hash("http://localhost/hello");
  test.isTrue(!!hashed);
});

Tinytest.add("MongoDiscovery - observeAndStore - add", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = createNewService("aa");

  WithNew(MongoDiscovery, {_dataFetchInterval: 10}, function() {
    var handler = MongoDiscovery._observerAndStore(coll.find(), store);
    coll.insert(doc);
    Meteor._sleepForMs(50);
    test.equal(store.get("aa"), doc);
    handler.stop();
  });
});

Tinytest.add("MongoDiscovery - observeAndStore - remove", function(test) {
  var store = new MongoDiscoveryStore(null, {dataFetchInterval: 10});
  var coll = new Mongo.Collection(Random.id());
  var doc = createNewService("aa");

  WithNew(MongoDiscovery, {_dataFetchInterval: 10}, function() {
    var handler = MongoDiscovery._observerAndStore(coll.find(), store);
    coll.insert(doc);
    Meteor._sleepForMs(50);
    test.equal(store.get("aa"), doc);

    coll.remove("aa")
    Meteor._sleepForMs(50);
    test.equal(store.get("aa"), undefined);
    handler.stop();
  });
});

Tinytest.add("MongoDiscovery - observeAndStore - changed", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = createNewService("aa");

  WithNew(MongoDiscovery, {_dataFetchInterval: 10}, function() {
    var handler = MongoDiscovery._observerAndStore(coll.find(), store);
    coll.insert(doc);
    Meteor._sleepForMs(50);
    test.equal(store.get("aa"), doc);

    coll.update("aa", {$set: {bb: 50}})
    Meteor._sleepForMs(50);
    test.equal(store.get("aa").bb, 50);
    handler.stop();
  });
});

Tinytest.add("MongoDiscovery - ping - with no options", function(test) {
  WithNewConnection(function() {
    MongoDiscovery._serviceName = "sname";
    MongoDiscovery._endpoint = "ep";

    MongoDiscovery._ping();
    MongoDiscovery._ping();
    MongoDiscovery._ping();

    Meteor._sleepForMs(50);
    var doc = MongoDiscovery._endpointsColl.findOne();
    test.equal(_.pick(doc, "endpoint", "serviceName"), {
      endpoint: "ep",
      serviceName: "sname"
    });

    test.isTrue(doc.timestamp.getTime() > 0);
  });
});

Tinytest.add("MongoDiscovery - ping - with sendAllInfo", function(test) {
  WithNewConnection(function() {
    MongoDiscovery._serviceName = "sname";
    MongoDiscovery._endpoint = "ep";
    MongoDiscovery._endpointHash = "hash";
    MongoDiscovery._balancer = "balancer";

    MongoDiscovery._ping({sendAllInfo: true});

    Meteor._sleepForMs(50);
    var doc = MongoDiscovery._endpointsColl.findOne();
    var fieldsToPick = ["endpoint", "serviceName", "endpointHash", "balancer"];
    test.equal(_.pick(doc, fieldsToPick), {
      endpoint: "ep",
      serviceName: "sname",
      endpointHash: "hash",
      balancer: "balancer"
    });

    test.isTrue(doc.timestamp.getTime() > 0);
  });
});

Tinytest.add("MongoDiscovery - register - balancer url by option",
function(test) {
  WithNewConnection(function() {
    MongoDiscovery.register("hello", {
      balancer: "bUrl"
    });
    test.equal(MongoDiscovery._balancer, "bUrl");
  });
});

Tinytest.add("MongoDiscovery - register - endpoint url by option",
function(test) {
  WithNewConnection(function() {
    MongoDiscovery.register("hello", {
      endpoint: "bUrl"
    });
    test.equal(MongoDiscovery._endpoint, "bUrl");
  });
});

Tinytest.add("MongoDiscovery - register - endpoint url by balancer",
function(test) {
  WithNewConnection(function() {
    MongoDiscovery.register("hello", {
      balancer: "bUrl"
    });
    test.equal(MongoDiscovery._balancer, "bUrl");
    test.equal(MongoDiscovery._endpoint, "bUrl");
  });
});

Tinytest.add("MongoDiscovery - register - no endpoint url",
function(test) {
  WithNewConnection(function() {
    MongoDiscovery.register("hello", {
      endpoint: "bUrl"
    });
    test.equal(MongoDiscovery._endpoint, "bUrl");
  });

  WithNewConnection(function() {
    MongoDiscovery.register("hello");
    // if no balancer UI, then, server is not going to register
    test.equal(MongoDiscovery._endpoint, null);
  });
});

Tinytest.add("MongoDiscovery - register - pinging",
function(test) {
  WithNewConnection(function() {
    MongoDiscovery.register("hello", {
      endpoint: "epoint",
      pingInterval: 50
    });
    Meteor._sleepForMs(60);

    var doc = MongoDiscovery._endpointsColl.findOne();
    var lastTimestamp = doc.timestamp.getTime();

    Meteor._sleepForMs(60);
    var doc = MongoDiscovery._endpointsColl.findOne();
    var nowTimestamp = doc.timestamp.getTime();

    // if no balancer UI, then, server is not going to register
    test.isTrue(nowTimestamp > lastTimestamp);
  });
});

Tinytest.add("MongoDiscovery - _getEndpoint - without _selfWeight", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {endpoint: "ep", serviceName: "s"})
    MongoDiscovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var service = MongoDiscovery._getEndpoint("s");
    test.equal(service.endpoint, "ep");
  });
});

Tinytest.add("MongoDiscovery - _getEndpoint - with _selfWeight", function(test) {
  WithNewConnection(function() {
    WithNew(MongoDiscovery, {_selfWeight: 0}, function() {
      WithNew(Cluster, {_endpoint: "ep"}, function() {
        var service = createNewService(Random.id(), {
          endpoint: "ep",
          endpointHash: MongoDiscovery._hash("ep"),
          serviceName: "s"
        });
        MongoDiscovery._endpointsColl.insert(service);

       var service2 = createNewService(Random.id(), {
          endpoint: "ep2",
          endpointHash: MongoDiscovery._hash("ep2"),
          serviceName: "s"
        });
        MongoDiscovery._endpointsColl.insert(service2);

        Meteor._sleepForMs(50);
        for(var lc=0; lc<100; lc++) {
          var service = MongoDiscovery._getEndpoint("s");
          test.equal(service.endpoint, "ep2");
        }
      });
    });
  });
});

Tinytest.add("MongoDiscovery - pickEndpoint - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {endpoint: "ep", serviceName: "s"})
    MongoDiscovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickEndpoint("s");
    test.equal(endpoint, "ep");
  });
});

Tinytest.add("MongoDiscovery - pickEndpoint - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickEndpoint("s");
    test.equal(endpoint, undefined);
  });
});

Tinytest.add("MongoDiscovery - pickEndpointHash - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      endpointHash: "hash", serviceName: "s"
    });
    MongoDiscovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var hash = MongoDiscovery.pickEndpointHash("s");
    test.equal(hash, "hash");

    var oldHash = MongoDiscovery.pickEndpointHash("s");
    test.equal(hash, oldHash);
  });
});

Tinytest.add("MongoDiscovery - pickEndpointHash - doesn't exist",
function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);

    var hash = MongoDiscovery.pickEndpointHash("s");
    test.equal(hash, undefined);
  });
});

Tinytest.add("MongoDiscovery - hashToEndpoint - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      endpoint: "ep",
      endpointHash: "hash",
      serviceName: "s"
    });
    MongoDiscovery._endpointsColl.insert(service);

    Meteor._sleepForMs(50);
    var hash = MongoDiscovery.pickEndpointHash("s");
    test.equal(hash, "hash");

    var endpoint = MongoDiscovery.hashToEndpoint(hash);
    test.equal(endpoint, "ep");
  });
});

Tinytest.add("MongoDiscovery - hashToEndpoint - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var hash = MongoDiscovery.pickEndpointHash("s");
    test.equal(hash, undefined);
  });
});

Tinytest.add("MongoDiscovery - pickBalancer - exist", function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w"
    });
    MongoDiscovery._endpointsColl.insert(service);
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickBalancer();
    test.equal(endpoint, "bUrl");
  });
});

Tinytest.add(
"MongoDiscovery - pickBalancer - given endpoint is a balancer",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    MongoDiscovery._endpointsColl.insert(service);

    var service2 = createNewService(Random.id(), {
      balancer: "bUrl2", service: "w", endpointHash: "e2"
    });
    MongoDiscovery._endpointsColl.insert(service2);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = MongoDiscovery.pickBalancer("e2");
      test.equal(endpoint, "bUrl2");
    }
  });
});

Tinytest.add(
"MongoDiscovery - pickBalancer - given endpoint is not a balancer",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    MongoDiscovery._endpointsColl.insert(service);

    var service2 = createNewService(Random.id(), {
      service: "w", endpointHash: "e2"
    });
    MongoDiscovery._endpointsColl.insert(service2);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = MongoDiscovery.pickBalancer("e2");
      test.equal(endpoint, "bUrl");
    }
  });
});

Tinytest.add(
"MongoDiscovery - pickBalancer - given endpoint doesn't exist",
function(test) {
  WithNewConnection(function() {
    var service = createNewService(Random.id(), {
      balancer: "bUrl", service: "w", endpointHash: "e1"
    });
    MongoDiscovery._endpointsColl.insert(service);

    Meteor._sleepForMs(50);

    for(var lc=0; lc<50; lc++) {
      var endpoint = MongoDiscovery.pickBalancer("e2-notexists");
      test.equal(endpoint, "bUrl");
    }
  });
});

Tinytest.add("MongoDiscovery - pickBalancer - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickBalancer();
    test.equal(endpoint, null);
  });
});

function WithNewConnection(fn) {
  MongoDiscovery.connect(process.env.MONGO_URL, Cluster, {
    collName: Random.id(),
    dataFetchInterval: 10
  });
  fn();
  MongoDiscovery.disconnect();
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
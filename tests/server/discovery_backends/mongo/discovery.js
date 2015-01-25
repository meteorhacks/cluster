Tinytest.add("MongoDiscovery - connect", function(test) {
  WithNewConnection(function() {
    var count = MongoDiscovery._endpointsColl.find().count();
    test.equal(count, 0);
  });
});

Tinytest.add("MongoDiscovery - hashing", function(test) {
  var hashed = MongoDiscovery._hash("http://localhost/hello");
  test.isTrue(!!hashed);
});

Tinytest.add("MongoDiscovery - observeAndStore - add", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = {_id: "aa", bb: 20};

  var handler = MongoDiscovery._observerAndStore(coll.find(), store);
  coll.insert(doc);
  Meteor._sleepForMs(50);
  test.equal(store.get("aa"), doc);
  handler.stop();
});

Tinytest.add("MongoDiscovery - observeAndStore - remove", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = {_id: "aa", bb: 20};

  var handler = MongoDiscovery._observerAndStore(coll.find(), store);
  coll.insert(doc);
  Meteor._sleepForMs(50);
  test.equal(store.get("aa"), doc);

  coll.remove("aa")
  Meteor._sleepForMs(50);
  test.equal(store.get("aa"), undefined);
  handler.stop();
});

Tinytest.add("MongoDiscovery - observeAndStore - changed", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = {_id: "aa", bb: 20};

  var handler = MongoDiscovery._observerAndStore(coll.find(), store);
  coll.insert(doc);
  Meteor._sleepForMs(50);
  test.equal(store.get("aa"), doc);

  coll.update("aa", {$set: {bb: 50}})
  Meteor._sleepForMs(50);
  test.equal(store.get("aa").bb, 50);
  handler.stop();
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

Tinytest.add("MongoDiscovery - register - balancer url by env",
function(test) {
  WithNewConnection(function() {
    process.env.BALANCER_URL="bUrl2";
    MongoDiscovery.register("hello");
    delete process.env.BALANCER_URL;
    test.equal(MongoDiscovery._balancer, "bUrl2");
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

Tinytest.add("MongoDiscovery - register - endpoint url by env",
function(test) {
  WithNewConnection(function() {
    process.env.ENDPOINT_URL="eUrl";
    MongoDiscovery.register("hello");
    delete process.env.ENDPOINT_URL;
    test.equal(MongoDiscovery._endpoint, "eUrl");
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

Tinytest.add("MongoDiscovery - pickEndpoint - exist", function(test) {
  WithNewConnection(function() {
    MongoDiscovery._endpointsColl.insert({endpoint: "ep", serviceName: "s"});
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
    MongoDiscovery._endpointsColl.insert({
      endpointHash: "hash", serviceName: "s"
    });
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
    MongoDiscovery._endpointsColl.insert({
      endpoint: "ep",
      endpointHash: "hash",
      serviceName: "s"
    });

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
    MongoDiscovery._endpointsColl.insert({balancer: "bUrl", service: "w"});
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickBalancer();
    test.equal(endpoint, "bUrl");
  });
});

Tinytest.add("MongoDiscovery - pickBalancer - doesn't exist", function(test) {
  WithNewConnection(function() {
    Meteor._sleepForMs(50);
    var endpoint = MongoDiscovery.pickBalancer();
    test.equal(endpoint, undefined);
  });
});

Tinytest.add("MongoDiscovery - isHealthy - healthy service", function(test) {
  var healthy = MongoDiscovery._isHealthy({
    timestamp: new Date(Date.now() - 200),
    pingInterval: 1000 * 5
  });

  test.isTrue(healthy);
});

Tinytest.add("MongoDiscovery - isHealthy - might be a healthy service", function(test) {
  var healthy = MongoDiscovery._isHealthy({
    timestamp: new Date(Date.now() - 1000 * 5),
    pingInterval: 1000 * 5
  });

  test.isTrue(healthy);
});

Tinytest.add("MongoDiscovery - isHealthy - not a healthy service", function(test) {
  var healthy = MongoDiscovery._isHealthy({
    timestamp: new Date(Date.now() - 1000 * 50),
    pingInterval: 1000 * 5
  });

  test.isFalse(healthy);
});

Tinytest.add("MongoDiscovery - isHealthy - while obeserving", function(test) {
  var store = new MongoDiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = {
    _id: "aa",
    serviceName: "s",
    pingInterval: 100,
    timestamp: new Date()
  };

  var handler = MongoDiscovery._observerAndStore(coll.find(), store, {
    healthCheckInterval: 50
  });

  coll.insert(doc);
  Meteor._sleepForMs(50);
  test.equal(store.getAll().length, 1);

  Meteor._sleepForMs(1200);
  test.equal(store.getAll().length, 0);

  coll.update({_id: doc._id}, {$set: {timestamp: new Date()}});
  Meteor._sleepForMs(50);
  test.equal(store.getAll().length, 1);

  handler.stop();
});


function WithNewConnection(fn) {
  MongoDiscovery.connect(process.env.MONGO_URL, {
    collName: Random.id()
  });
  fn();
  MongoDiscovery.disconnect();
}
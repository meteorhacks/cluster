Tinytest.add("MongoDiscovery - connect", function(test) {
  WithNewConnection(function() {
    var cursor = MongoDiscovery._endpointsColl.find();
    var size = Meteor.wrapAsync(cursor.count, cursor)();
    test.equal(size, 0);
  });
});

Tinytest.addAsync("MongoDiscovery - startWatching - cursors", function(test, done) {
  var store = new DiscoveryStore();
  var coll = new Mongo.Collection(Random.id());
  var doc = createNewService("aa");

  var newFields = {
    _dataFetchInterval: 10,
    _observerAndStore: sinon.stub().returns({stop: function() {}})
  };

  WithNewConnection(function() {
    WithNew(MongoDiscovery, newFields, function() {
      var payload = MongoDiscovery._startWatching();
      test.equal(newFields._observerAndStore.callCount, 2);

      var cursor1 = newFields._observerAndStore.firstCall.args[0];
      test.equal(cursor1.selector, {});
      test.equal(cursor1.limitValue, 100);
      test.equal(cursor1.sortValue, {timestamp: -1});

      var cursor2 = newFields._observerAndStore.secondCall.args[0];
      test.equal(cursor2.selector, {balancer: {$ne: null}});
      test.equal(cursor2.limitValue, 100);
      test.equal(cursor2.sortValue, {timestamp: -1});

      test.equal(typeof payload.stop, 'function');
      done();
    });
  });
});

Tinytest.add("MongoDiscovery - observeAndStore - add", function(test) {
  var store = new DiscoveryStore();
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
  var store = new DiscoveryStore(null, {dataFetchInterval: 10});
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
  var store = new DiscoveryStore();
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

Tinytest.add("MongoDiscovery - ping", function(test) {
  WithNewConnection(function() {

    var keys = {a: "aa", b: "bb"};
    var payload1 = {k: "kk", y: "yy"};
    var payload2 = {k: "kk", y: "yyy"};

    MongoDiscovery.ping(keys, payload1);
    MongoDiscovery.ping(keys, payload2);
    Meteor._sleepForMs(50);

    var doc = MongoDiscovery._endpointsColl.findOne();
    test.equal(_.omit(doc, "_id"), {
      a: "aa",
      b: "bb",
      k: "kk",
      y: "yyy"
    });
  });
});

function WithNewConnection(fn, endpoints, balancers) {
  endpoints = endpoints || new DiscoveryStore();
  balancers = balancers || new DiscoveryStore();

  MongoDiscovery.connect(process.env.MONGO_URL, endpoints, balancers, {
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
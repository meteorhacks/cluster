Tinytest.add("MongoDiscoveryStore - set and get methods", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);

  test.equal(store.get("one"), doc);
  test.equal(store.getAll(), [doc]);
  test.equal(store.getAll("sname"), [doc]);
  test.equal(store.byEndpointHash("aaa"), doc);
});

Tinytest.add("MongoDiscoveryStore - set and remove", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);
  store.remove("one");

  test.equal(store.get("one"), undefined);
  test.equal(store.getAll(), []);
  test.equal(store.getAll("sname"), []);
  test.equal(store.byEndpointHash("aaa"), undefined);
});

Tinytest.add("MongoDiscoveryStore - set twice and get methods", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  var doc2 = {endpointHash: "other", serviceName: "other"};
  store.set("one", doc);
  store.set("two", doc2);

  test.equal(store.get("one"), doc);
  test.equal(store.getAll(), [doc, doc2]);
  test.equal(store.getAll("sname"), [doc]);
  test.equal(store.byEndpointHash("aaa"), doc);
});

Tinytest.add("MongoDiscoveryStore - set and getRandom", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);

  test.equal(store.getRandom(), doc);
});

Tinytest.add("MongoDiscoveryStore - set and getRandom with serviceName",
function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);

  test.equal(store.getRandom("sname"), doc);
});

Tinytest.add("MongoDiscoveryStore - set and getRandom with no serviceName",
function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);

  test.equal(store.getRandom("something-else"), undefined);
});
Tinytest.add("MongoDiscoveryStore - set and get methods", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);

  test.equal(store.get("one"), doc);
  test.equal(store.getAll(), [doc]);
  test.equal(store.getAll("sname"), [doc]);
  test.equal(store.byEndpointHash("aaa"), doc);
});

Tinytest.add("MongoDiscoveryStore - set twice and get", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname"};
  store.set("one", doc);
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

Tinytest.add("MongoDiscoveryStore - set and get byBalancer", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname", balancer: "burl"};
  store.set("one", doc);
  store.set("one", doc);

  test.equal(store.get("one"), doc);
  test.equal(store.getAll(), [doc]);
  test.equal(store.getAll("sname"), [doc]);
  test.equal(store.byEndpointHash("aaa"), doc);
  test.equal(store.byBalancer("burl"), doc);
});

Tinytest.add("MongoDiscoveryStore - set and remove byBalancer", function(test) {
  var store = new MongoDiscoveryStore();
  var doc = {endpointHash: "aaa", serviceName: "sname", balancer: "burl"};
  store.set("one", doc);
  store.remove("one");

  test.equal(store.get("one"), undefined);
  test.equal(store.getAll(), []);
  test.equal(store.getAll("sname"), []);
  test.equal(store.byEndpointHash("aaa"), undefined);
  test.equal(store.byBalancer("burl"), undefined);
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

Tinytest.add("MongoDiscoveryStore - set and getRandomWeigthed - weight == 0", function(test) {
  var store = new MongoDiscoveryStore();
  addEndpoints(store, ['e1', 'e2', 'e3', 'e4']);

  var diff = getWeightDiff(store, "e2", 0, 0);
  test.equal(diff, 0);
});


Tinytest.add("MongoDiscoveryStore - set and getRandomWeigthed - weight == 0.5", function(test) {
  var store = new MongoDiscoveryStore();
  addEndpoints(store, ['e1', 'e2', 'e3', 'e4']);

  var diff = getWeightDiff(store, "e2", 0.5, 0.125);
  test.isTrue(diff < 0.1);
});

Tinytest.add("MongoDiscoveryStore - set and getRandomWeigthed - weight == 1", function(test) {
  var store = new MongoDiscoveryStore();
  addEndpoints(store, ['e1', 'e2', 'e3', 'e4']);

  var diff = getWeightDiff(store, "e2", 1, 0.25);
  test.isTrue(diff < 0.1);
});

Tinytest.add("MongoDiscoveryStore - only one service", function(test) {
  var store = new MongoDiscoveryStore();
  addEndpoints(store, ['e1']);

  var diff = getWeightDiff(store, "e1", 1, 1);
  test.equal(diff, 0);
});


function addEndpoints(store, endpointHases) {
  endpointHases.forEach(function(hash) {
    store.set(Math.random(), {serviceName: "sname", endpointHash: hash});
  });
}

function getWeightDiff(store, endpointHash, weight, expectedRouting) {
  var iterations = 10000;
  var endpointSelected = 0;

  for(var lc=0; lc<iterations; lc++) {
    var service = store.getRandomWeigthed("sname", endpointHash, weight);
    if(service.endpointHash === endpointHash) {
      endpointSelected++;
    }
  }

  var diff = Math.abs((endpointSelected/iterations) - expectedRouting);
  return diff;
}
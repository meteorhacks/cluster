MongoBackend.connect(process.env.MONGO_URL);

Tinytest.add("Backends - Mongo - connecting",
function(test) {
  MongoBackend._services.remove({});

  var doc = {_id: "aa", bb: 10};
  MongoBackend._services.insert(doc);
  var retreivedDoc = MongoBackend._services.findOne();

  test.equal(retreivedDoc, doc);
});

Tinytest.add("Backends - Mongo - sendHeartbeat",
function(test) {
  MongoBackend._services.remove({});

  MongoBackend.sendHeartbeat("av", "url", "service", 15000, {aa: 20, bb: 40});
  var selector = {
    autoupdateVersion: "av",
    url: "url",
    service: "service"
  };
  var options = {};
  var retreivedDoc = MongoBackend._services.findOne(selector, options);
  test.equal(_.pick(retreivedDoc, "aa", "bb"), {aa: 20, bb: 40});
  test.isTrue(retreivedDoc.timestamp.getTime() < Date.now());
  test.equal(retreivedDoc.maxHeartBeatTimeout, 15000);
});

Tinytest.add("Backends - Mongo - sendHeartbeat and upser the payload",
function(test) {
  MongoBackend._services.remove({});

  MongoBackend.sendHeartbeat("av", "url", "service", 15000, {aa: 20, bb: 40});
  var selector = {
    autoupdateVersion: "av",
    url: "url",
    service: "service"
  };
  var options = {fields: {aa: 1, bb: 1}};
  var retreivedDoc = MongoBackend._services.findOne(selector, options);
  test.equal(_.omit(retreivedDoc, "_id"), {aa: 20, bb: 40});

  MongoBackend.sendHeartbeat("av", "url", "service", 15000, {aa: 60});
  retreivedDoc = MongoBackend._services.findOne(selector, options);
  test.equal(_.omit(retreivedDoc, "_id"), {aa: 60, bb: 40});
});
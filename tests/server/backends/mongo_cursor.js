Tinytest.add("Backends - MongoCursor - fetch services",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 15000);

  var cursor = new MongoBackend.Cursor("serviceName");
  var result = cursor.fetch();
  test.equal(result[0].url, "url");
});

Tinytest.add("Backends - MongoCursor - sort by timestamp",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 15000);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 15000);

  var cursor = new MongoBackend.Cursor("serviceName", {}, {limit: 2});
  var result = cursor.fetch();
  test.equal(result[0].url, "url2");
  test.equal(result[1].url, "url");
});

Tinytest.add("Backends - MongoCursor - filter fields",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 15000);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 15000);

  var options = {limit: 2, fields: {url: 1, service: 1}}
  var cursor = new MongoBackend.Cursor("serviceName", {}, options);
  var result = cursor.fetch();
  test.equal(result[0], {service: "serviceName", url: "url2", _id: "url2"});
  test.equal(result[1], {service: "serviceName", url: "url", _id: "url"});
});


Tinytest.add("Backends - MongoCursor - limiting",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 15000);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 15000);
  MongoBackend.sendHeartbeat("av", "url3", "serviceName", 15000);

  var cursor = new MongoBackend.Cursor("serviceName", {}, {limit: 2});
  var result = cursor.fetch();
  test.equal(result.length, 2);
  test.equal(result[0].url, "url3");
  test.equal(result[1].url, "url2");
});

// Tinytest.add("Backends - MongoCursor - remove unhealthy services",
// function(test) {
//   MongoBackend._services.remove({});
//   MongoBackend.sendHeartbeat("av", "url", "serviceName", 500);
//   Meteor._sleepForMs(1500);
//   MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
//   MongoBackend.sendHeartbeat("av", "url3", "serviceName", 500);

//   var cursor = new MongoBackend.Cursor("serviceName", {}, {limit: 3});
//   var result = cursor.fetch();

//   test.equal(result.length, 2);
//   test.equal(result[0].url, "url3");
//   test.equal(result[1].url, "url2");
// });

Tinytest.add("Backends - MongoCursor - fetch & $currUrl - get it",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url3", "serviceName", 500);

  var query = {$currUrl: "url"};
  var cursor = new MongoBackend.Cursor("serviceName", query, {limit: 2});
  var result = cursor.fetch();

  test.equal(result.length, 2);
  test.equal(result[0].url, "url3");
  test.equal(result[1].url, "url");
});

// Tinytest.add("Backends - MongoCursor - fetch & $currUrl - currUrl is inactive",
// function(test) {
//   MongoBackend._services.remove({});
//   MongoBackend.sendHeartbeat("av", "url", "serviceName", 500);
//   Meteor._sleepForMs(1500);
//   MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
//   MongoBackend.sendHeartbeat("av", "url3", "serviceName", 500);

//   var query = {$currUrl: "url"};
//   var cursor = new MongoBackend.Cursor("serviceName", query, {limit: 2});
//   var result = cursor.fetch();

//   test.equal(result.length, 2);
//   test.equal(result[0].url, "url3");
//   test.equal(result[1].url, "url2");
// });

Tinytest.add("Backends - MongoCursor - fetch & $autoupdateVersion",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
  MongoBackend.sendHeartbeat("av2", "url3", "serviceName", 500);

  var query = {$autoupdateVersion: "av"};
  var cursor = new MongoBackend.Cursor("serviceName", query, {limit: 2});
  var result = cursor.fetch();

  test.equal(result.length, 2);
  test.equal(result[0].url, "url2");
  test.equal(result[1].url, "url");
});

Tinytest.add("Backends - MongoCursor - fetch & $autoupdateVersion, not enough",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av2", "url", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url3", "serviceName", 500);

  var query = {$autoupdateVersion: "av2"};
  var cursor = new MongoBackend.Cursor("serviceName", query, {limit: 2});
  var result = cursor.fetch();

  test.equal(result.length, 2);
  test.equal(result[0].url, "url3");
  test.equal(result[1].url, "url");
});

Tinytest.add("Backends - MongoCursor - fetch & $autoupdateVersion & $currUrl",
function(test) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av2", "url", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url2", "serviceName", 500);
  MongoBackend.sendHeartbeat("av", "url3", "serviceName", 500);

  var query = {$autoupdateVersion: "av2", $currUrl: "url"};
  var cursor = new MongoBackend.Cursor("serviceName", query, {limit: 2});
  var result = cursor.fetch();

  test.equal(result.length, 2);
  test.equal(result[0].url, "url3");
  test.equal(result[1].url, "url");
  test.equal(result[1].autoupdateVersion, "av");
});

Tinytest.addAsync("Backends - MongoCursor - observeChanges - fetch & listen",
function(test, done) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "service", 500);
  MongoBackend.sendHeartbeat("av", "url2", "service", 500);

  var query = {};
  var cursor = new MongoBackend.Cursor("service", query, {limit: 2});
  var urls = [];
  var h = cursor.observeChanges({
    added: function(url, service) {
      test.equal(typeof service, "object");
      urls.push(url);
    }
  });

  h.stop();
  test.equal(urls, ['url2', 'url']);
  done();
});

Tinytest.addAsync("Backends - MongoCursor - observeChanges - new updates",
function(test, done) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "service", 500);
  MongoBackend.sendHeartbeat("av", "url2", "service", 500);

  var query = {};
  var options = {limit: 2, interval: 50};
  var cursor = new MongoBackend.Cursor("service", query, options);
  var added = [];
  var removed = [];
  var h = cursor.observeChanges({
    added: function(url, service) {
      added.push(url);
    },
    removed: function(url) {
      removed.push(url);
    }
  });
  MongoBackend.sendHeartbeat("av", "url3", "service", 500);
  Meteor._sleepForMs(100);

  h.stop();
  test.equal(added, ['url2', 'url', 'url3']);
  test.equal(removed, ['url']);
  done();
});

Tinytest.addAsync("Backends - MongoCursor - observeChanges - stopping",
function(test, done) {
  MongoBackend._services.remove({});
  MongoBackend.sendHeartbeat("av", "url", "service", 500);
  MongoBackend.sendHeartbeat("av", "url2", "service", 500);

  var query = {};
  var options = {limit: 2, interval: 50};
  var cursor = new MongoBackend.Cursor("service", query, options);
  var added = [];
  var removed = [];
  var h = cursor.observeChanges({
    added: function(url, service) {
      added.push(url);
    },
    removed: function(url) {
      removed.push(url);
    }
  });
  h.stop();

  MongoBackend.sendHeartbeat("av", "url3", "service", 500);
  Meteor._sleepForMs(100);

  test.equal(added, ['url2', 'url']);
  test.equal(removed, []);
  done();
});
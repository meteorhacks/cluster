var Cookies = Npm.require('cookies');

ClusterManager.loadBalance = function loadBalance(serviceName) {
  ClusterManager._pushPublicUrl();

  var query = {};
  var options = {};
  var cursor = new MongoBackend.Cursor(serviceName, query, options);
  var maxKeepUrls = 5;
  var urls = [];
  var urlLastlyUpdatedBy = new Date();

  // currently, we get the _id of these callbacks as the serviceName
  // So, we better work on some better solution once it has url as the _id
  cursor.observeChanges({
    added: updateURL,
    changed: updateURL
  });

  function updateURL(id, service) {
    urls.unshift(service.url);
    if(urls.length > maxKeepUrls) {
      urls.pop();
    }
    urlLastlyUpdatedBy = new Date();
  }

  // Implement the Balancer
  Picker.middleware(function(req, res, next) {
    var cookies = new Cookies(req, res);

    next();
  });
};

ClusterManager._pushPublicUrl = function() {
  Picker.middleware(function(req, res, next) {
    console.log("cookie:" + res.cookie);
    res.pushData("clusterManager.publicUrl", ClusterManager._serviceUrl);
    next();
  });
};
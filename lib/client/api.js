Cluster.discoverConnection = function(serviceName, ddpOptions) {
  var url;

  // use Meteor.absoluteUrl() to construct url by default, just for supporting cordova.
  if (!ddpOptions || ddpOptions.useAbsoluteUrl) {
    url = Meteor.absoluteUrl(serviceName);
  } else {
    url = "/" + serviceName;
  }

  return DDP.connect(url);
};
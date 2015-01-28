var discoveryUrl = process.env['CLUSTER_DISCOVERY_URL'];
if(discoveryUrl) {
  Cluster.connect(discoveryUrl);
}

var serviceName = process.env['CLUSTER_SERVICE'];
if(serviceName) {
  Cluster.register(serviceName);
}

var publicServices = process.env['CLUSTER_PUBLIC_SERVICES'];
if(publicServices) {
  publicServices = publicServices.split(',').map(function(service) {
    return service.trim();
  });
  Cluster.allowPublicAccess(publicServices);
}
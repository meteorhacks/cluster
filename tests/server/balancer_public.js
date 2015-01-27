Tinytest.add("Balancer - handleHttp - no discovery", function(test) {
  WithDiscovery(null, function() {
    var result = Balancer.handleHttp();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - handleHttp - from balancer header", function(test) {
  WithDiscovery({}, function() {
    var req = {
      headers: {"from-balancer": "http://balancer.com"}
    };
    var res = {};
    var balancerMock = sinon.mock(Balancer);
    balancerMock.expects("_pushBalancerUrl").once().withArgs(req, res);

    var result = Balancer.handleHttp(req, res);

    test.equal(result, false);
    balancerMock.verify();
    balancerMock.restore();
  });

});

Tinytest.add("Balancer - handleHttp - with cookies and endpoint",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpoint-url";

  var req = {headers: {}};
  var res = {};

  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;
  cookiesProto.get = sinon.stub();

  cookiesProto.get
    .onCall(0).returns(endpointHash)

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickEndpoint')
    .withArgs(endpointHash)
    .returns(endpointUrl);
  balancerMock.expects('_setBalanceUrlHeader')
    .withArgs(req);
  balancerMock.expects('_proxyWeb')
    .withArgs(req, res, endpointUrl);

  WithDiscovery({}, function() {
    var result = Balancer.handleHttp(req, res);
    test.equal(result, true);
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
    cookiesProto.get = originalGet;
  });
});

Tinytest.add("Balancer - handleHttp - no endpoint",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpointUrl";

  var expectedReq = {
    headers: {'from-balancer': balancerUrl}
  };

  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;
  cookiesProto.get = sinon.stub();

  cookiesProto.get
    .onCall(0).returns(endpointHash)

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickEndpoint')
    .withArgs(endpointHash)
    .returns(false);

  WithDiscovery({}, function() {
    var result = Balancer.handleHttp({headers: {}}, {});
    test.equal(result, false);
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
    cookiesProto.get = originalGet;
  });
});

Tinytest.add("Balancer - handleWs - no discovery", function(test) {
  WithDiscovery(null, function() {
    var result = Balancer.handleWs();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - handleWs - from balancer header", function(test) {
  WithDiscovery({}, function() {
    var res = {
      headers: {"from-balancer": "http://balancer.com"}
    };
    var result = Balancer.handleWs(res);
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - handleWs - no endpoint", function(test) {
  var cookiesProto = Npm.require('cookies');
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.returns(false);

  var res = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock
    .expects('_pickJustEndpoint').returns(false);

  WithDiscovery({}, function() {
    var result = Balancer.handleWs(res, socket, head);
    test.equal(result, false);

    balancerMock.verify();
    balancerMock.restore();
    cookiesProto.get = originalGet;
  });
});

Tinytest.add("Balancer - handleWs - process okay", function(test) {
  var endpointUrl = "endpoint-url";
  var cookiesProto = Npm.require('cookies');
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.returns(false);

  var req = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock
    .expects('_pickJustEndpoint').returns(endpointUrl);
  balancerMock
    .expects('_setBalanceUrlHeader')
    .withArgs(req);
  balancerMock
    .expects('_proxyWs')
    .withArgs(req, socket, head, endpointUrl);

  WithDiscovery({}, function() {
    var result = Balancer.handleWs(req, socket, head);
    test.equal(result, true);

    balancerMock.verify();
    balancerMock.restore();
    cookiesProto.get = originalGet;
  });
});
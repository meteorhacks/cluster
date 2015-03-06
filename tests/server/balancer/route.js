var originalProcessHereHTTP = Balancer._processHereHTTP;
var originalProcessHereWs = Balancer._processHereWS;

Tinytest.add("Balancer - handleHttp - setup", setup);

Tinytest.add("Balancer - handleHttp - no discovery", function(test) {
  WithDiscovery(null, function() {
    var result = Balancer.handleHttp();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - handleHttp - inside a worker", function(test) {
  var newEnv = {CLUSTER_WORKER_ID: "10"};
  WithNew(process.env, WithNew, function() {
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
    var result = Balancer.handleHttp(req, res);

    test.equal(result, false);
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
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);
  balancerMock.expects('_pickEndpoint')
    .withArgs(endpointHash)
    .returns(endpointUrl);
  balancerMock.expects('_setFromBalanceUrlHeader')
    .withArgs(req);
  balancerMock.expects('_proxyWeb')
    .withArgs(req, res, endpointUrl);

  var discovery = {
    pickBalancer: sinon.stub().returns(undefined)
  };

  WithDiscovery(discovery, function() {
    var result = Balancer.handleHttp(req, res);
    test.equal(result, true);
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
    cookiesProto.get = originalGet;
  });
});

Tinytest.add("Balancer - handleHttp - balancer and /info",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpoint-url";

  var req = {headers: {}, url: "/sockjs/info?"};
  var res = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_sendSockJsInfo')
    .withArgs(req, res);

  var discovery = {
    pickBalancer: sinon.stub().returns(balancerUrl)
  };

  WithDiscovery(discovery, function() {
    var result = Balancer.handleHttp(req, res);
    test.equal(result, true);
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add("Balancer - handleHttp - ddp and endpoint",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpoint-url";
  var service = "web";

  var req = {headers: {}};
  var res = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns({
    hash: endpointHash,
    service: service
  });
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(endpointHash, service)
    .returns(endpointUrl);
  balancerMock.expects('_setFromBalanceUrlHeader')
    .withArgs(req);
  balancerMock.expects('_proxyWeb')
    .withArgs(req, res, endpointUrl);

  var discovery = {
    pickBalancer: sinon.stub().returns(undefined)
  };

  WithDiscovery(discovery, function() {
    var result = Balancer.handleHttp(req, res);
    test.equal(result, true);
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add("Balancer - handleHttp - current endpoint",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpoint-url";
  var service = "web";

  var req = {headers: {}};
  var res = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns({
    hash: endpointHash,
    service: service
  });
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(endpointHash, service)
    .returns(endpointUrl);

  var discovery = {
    pickBalancer: sinon.stub().returns(undefined)
  };

  WithDiscovery(discovery, function() {
    WithCluster({_endpoint: endpointUrl}, function() {
      var result = Balancer.handleHttp(req, res);
      test.equal(result, false);
      Meteor._sleepForMs(50);

      balancerMock.verify();
      balancerMock.restore();
    });
  });
});

Tinytest.add("Balancer - handleHttp - ddp and no endpoint",
function(test) {
  var balancerUrl = "burl";
  var endpointHash = "hash";
  var endpointUrl = "endpoint-url";
  var service = "web";

  var req = {headers: {}};
  var res = {end: sinon.mock(), writeHead: sinon.mock()};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns({
    hash: endpointHash,
    service: service
  });
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(endpointHash, service)
    .returns(undefined);

  var discovery = {
    pickBalancer: sinon.stub().returns(undefined)
  };

  WithDiscovery(discovery, function() {
    var result = Balancer.handleHttp(req, res);
    test.equal(result, true);
    test.isTrue(res.end.called);
    test.isTrue(res.writeHead.calledWith(500));
    Meteor._sleepForMs(50);

    balancerMock.verify();
    balancerMock.restore();
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
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);
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

Tinytest.add("Balancer - handleHttp - teardown", teardown);
Tinytest.add("Balancer - handleWs - setup", setup);

Tinytest.add("Balancer - handleWs - no discovery", function(test) {
  WithDiscovery(null, function() {
    var result = Balancer.handleWs();
    test.equal(result, false);
  });
});

Tinytest.add("Balancer - handleWs - inside a worker", function(test) {
  var newEnv = {CLUSTER_WORKER_ID: "22323"};
  WithNew(process.env, newEnv, function() {
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

Tinytest.add("Balancer - handleWs - no endpointHash", function(test) {
  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.onCall(0).returns(undefined);

  var res = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);

  WithDiscovery({}, function() {
    var result = Balancer.handleWs(res, socket, head);
    test.equal(result, false);
    cookiesProto.get = originalGet;

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add("Balancer - handleWs - no endpoint", function(test) {
  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.onCall(0).returns("someHash");

  var res = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);
  balancerMock.expects('_pickJustEndpoint').returns(false);

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
  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.returns("someHash");

  var req = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);
  balancerMock
    .expects('_pickJustEndpoint').returns(endpointUrl);
  balancerMock
    .expects('_setFromBalanceUrlHeader')
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

Tinytest.add("Balancer - handleWs - current endpoint", function(test) {
  var endpointUrl = "endpoint-url";
  var cookiesProto = Npm.require('cookies').prototype;
  var originalGet = cookiesProto.get;

  cookiesProto.get = sinon.stub();
  cookiesProto.get.returns("someHash");

  var req = {headers: {}};
  var socket = {};
  var head = {};

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns(undefined);
  balancerMock
    .expects('_pickJustEndpoint').returns(endpointUrl);

  WithDiscovery({}, function() {
    WithCluster({_endpoint: endpointUrl}, function() {
      var result = Balancer.handleWs(req, socket, head);
      test.equal(result, false);

      balancerMock.verify();
      balancerMock.restore();
      cookiesProto.get = originalGet;
    });
  });
});

Tinytest.add(
"Balancer - handleWs - process okay, hash via ddp url",
function(test) {
  var endpointUrl = "endpoint-url";
  var req = {headers: {}};
  var socket = {};
  var head = {};
  var hash = "hash";
  var service = "service";

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_rewriteDdpUrl').returns({
    hash: hash,
    service: service
  });
  balancerMock
    .expects('_pickJustEndpoint')
    .withArgs(hash, service)
    .returns(endpointUrl);
  balancerMock
    .expects('_setFromBalanceUrlHeader')
    .withArgs(req);
  balancerMock
    .expects('_proxyWs')
    .withArgs(req, socket, head, endpointUrl);

  WithDiscovery({}, function() {
    var result = Balancer.handleWs(req, socket, head);
    test.equal(result, true);

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add("Balancer - handleWs - teardown", teardown);

function teardown() {
  Balancer._processHereHTTP = originalProcessHereHTTP;
  Balancer._processHereWS = originalProcessHereWs;
}

function setup() {
  Balancer._processHereHTTP = function() {return false};
  Balancer._processHereWS = function() {return false};
}
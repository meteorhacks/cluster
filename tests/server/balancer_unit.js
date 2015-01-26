Tinytest.add("Balancer Unit - _urlToTarget", function(test) {
  var url = "http://abc.hello.com:8000";
  var target = Balancer._urlToTarget(url);
  test.equal(target, {
    host: "abc.hello.com",
    port: "8000"
  });
});

Tinytest.add("Balancer Unit - _pickAndSetEndpointHash - has endpoint",
function(test) {
  var hash = "the-hash";
  var discovery = {
    pickEndpointHash: sinon.spy(sinon.stub().returns(hash))
  };

  WithDiscovery(discovery, function() {
    var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetEndpointHash(cookies);

    test.equal(result, hash);
    test.isTrue(cookies.set.calledWith("cluster-endpoint", hash));
    test.isTrue(discovery.pickEndpointHash.calledWith("web"));
  });
});

Tinytest.add("Balancer Unit - _pickAndSetEndpointHash - no endpoint",
function(test) {
  var hash = "the-hash";
  var discovery = {
    pickEndpointHash: sinon.spy(sinon.stub().returns(null))
  };

  WithDiscovery(discovery, function() {
    var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetEndpointHash(cookies);

    test.equal(result, false);
    test.isFalse(cookies.set.called);
    test.isTrue(discovery.pickEndpointHash.calledWith("web"));
  });
});

Tinytest.add(
"Balancer Unit - _pickEndpoint - with nullHash and didn't get a hash",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var discovery = {
    hashToEndpoint: sinon.spy(sinon.stub().returns(false))
  }

  WithDiscovery(discovery, function() {
    var mock = sinon.mock(Balancer);
    mock.expects('_pickAndSetEndpointHash').returns(false);

    var result = Balancer._pickEndpoint(null, {});

    test.equal(result, false);
    test.isFalse(discovery.hashToEndpoint.called);
    mock.restore();
  });
});

Tinytest.add(
"Balancer Unit - _pickEndpoint - with nullHash and get a hash",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var discovery = {
    hashToEndpoint: sinon.spy(sinon.stub().returns(endpoint))
  }

  WithDiscovery(discovery, function() {
    var mock = sinon.mock(Balancer);
    mock.expects('_pickAndSetEndpointHash').returns(hash);

    var result = Balancer._pickEndpoint(null, {});

    test.equal(result, endpoint);
    test.isTrue(discovery.hashToEndpoint.calledWith(hash));
    mock.restore();
  });
});

Tinytest.add(
"Balancer Unit - _pickEndpoint - have hash but no endpoint - retried",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var hashToEndpoint = sinon.stub();
  hashToEndpoint.onCall(0).returns(false);
  hashToEndpoint.onCall(1).returns(endpoint);

  var discovery = {
    hashToEndpoint: sinon.spy(hashToEndpoint)
  }

  WithDiscovery(discovery, function() {
    var mock = sinon.mock(Balancer);
    mock.expects('_pickAndSetEndpointHash').twice().returns(hash);

    var result = Balancer._pickEndpoint(null, {});

    test.equal(result, false);
    test.isTrue(discovery.hashToEndpoint.calledTwice);
    mock.restore();
  });
});

Tinytest.add(
"Balancer Unit - _pickEndpoint - have hash but no endpoint - only one retry",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var hashToEndpoint = sinon.stub();
  hashToEndpoint.onCall(0).returns(false);
  hashToEndpoint.onCall(1).returns(false);

  var discovery = {
    hashToEndpoint: sinon.spy(hashToEndpoint)
  }

  WithDiscovery(discovery, function() {
    var mock = sinon.mock(Balancer);
    mock.expects('_pickAndSetEndpointHash').exactly(2).returns(hash);

    var result = Balancer._pickEndpoint(null, {});

    test.equal(result, false);
    test.equal(discovery.hashToEndpoint.callCount, 2);
    mock.restore();
  });
});

Tinytest.add(
"Balancer Unit - _pickJustEndpoint - no hash provided",
function(test) {
  var endpoint = "end-point";
  var discovery = {
    pickEndpoint: sinon.spy(sinon.stub().returns(endpoint))
  }

  WithDiscovery(discovery, function() {
    var result = Balancer._pickJustEndpoint();
    test.equal(result, endpoint);
    test.isTrue(discovery.pickEndpoint.calledWith("web"));
  });
});

Tinytest.add(
"Balancer Unit - _pickJustEndpoint - hash provided, has endpoint",
function(test) {
  var endpoint = "end-point";
  var hash = "the-hash";
  var discovery = {
    hashToEndpoint: sinon.spy(sinon.stub().returns(endpoint))
  }

  WithDiscovery(discovery, function() {
    var result = Balancer._pickJustEndpoint(hash);
    test.equal(result, endpoint);
    test.isTrue(discovery.hashToEndpoint.calledWith(hash));
  });
});

Tinytest.add(
"Balancer Unit - _pickJustEndpoint - hash provided, no endpoint",
function(test) {
  var endpoint = "end-point";
  var hash = "the-hash";
  var discovery = {
    hashToEndpoint: sinon.spy(sinon.stub().returns(false)),
    pickEndpoint: sinon.spy(sinon.stub().returns(endpoint))
  }

  WithDiscovery(discovery, function() {
    var result = Balancer._pickJustEndpoint(hash);
    test.equal(result, endpoint);

    test.isTrue(discovery.hashToEndpoint.calledWith(hash));
    test.isTrue(discovery.pickEndpoint.calledWith("web"));
  });
});

Tinytest.add(
"Balancer Unit - _pickAndSetBalancer - there is a balancer",
function(test) {
  var balancer = "the-balancer";
  var discovery = {
    pickBalancer: sinon.spy(sinon.stub().returns(balancer))
  }

  WithDiscovery(discovery, function() {
    var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetBalancer(cookies);

    test.equal(result, balancer);
    test.isTrue(cookies.set.calledWith("cluster-balancer", balancer));
  });
});

Tinytest.add(
"Balancer Unit - _pickAndSetBalancer - there is no balancer",
function(test) {
  var balancer = "the-balancer";
  var discovery = {
    pickBalancer: sinon.spy(sinon.stub().returns(false))
  }

  WithDiscovery(discovery, function() {
    var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetBalancer(cookies);

    test.equal(result, false);
    test.isFalse(cookies.set.called);
  });
});

Tinytest.add(
"Balancer Unit - _proxyWeb - no error",
function(test) {
  var req = {aa: 10};
  var res = {bb: 10};
  var endpoint = "http://aa.com:8000";
  var cookies = {};

  var target = {
    host: "aa.com",
    port: "8000"
  };
  var options = {target: target};

  var proxyMock = sinon.mock(Balancer.proxy);
  proxyMock.expects("web").once().withArgs(req, res, options);

  Balancer._proxyWeb(req, res, endpoint, cookies);

  Meteor._sleepForMs(50);

  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
"Balancer Unit - _proxyWeb - error and retry",
function(test) {
  var req = {aa: 10};
  var res = {bb: 10};
  var endpoint = "http://aa.com:8000";
  var cookies = {};

  var target = {
    host: "aa.com",
    port: "8000"
  };
  var options = {target: target};
  var error = {message: "this-is-an-error"};

  var proxyMock = sinon.mock(Balancer.proxy);
  proxyMock.expects("web")
    .exactly(2)
    .withArgs(req, res, options)
    .onCall(0).callsArgWith(3, error);

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects("_pickEndpoint")
    .exactly(1)
    .withArgs(null, cookies)
    .returns(endpoint);

  Balancer._proxyWeb(req, res, endpoint, cookies);

  Meteor._sleepForMs(50);

  balancerMock.verify();
  balancerMock.restore();

  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
"Balancer Unit - _proxyWeb - max retries 2",
function(test) {
  var req = {aa: 10};
  var res = {bb: 10, end: sinon.spy()};
  var endpoint = "http://aa.com:8000";
  var cookies = {};

  var target = {
    host: "aa.com",
    port: "8000"
  };
  var options = {target: target};
  var error = {message: "this-is-an-error"};

  var proxyMock = sinon.mock(Balancer.proxy);
  proxyMock.expects("web")
    .exactly(3)
    .withArgs(req, res, options)
    .callsArgWith(3, error);

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects("_pickEndpoint")
    .exactly(2)
    .withArgs(null, cookies)
    .returns(endpoint);

  Balancer._proxyWeb(req, res, endpoint, cookies);

  Meteor._sleepForMs(50);

  test.isTrue(res.end.called);

  balancerMock.verify();
  balancerMock.restore();

  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
"Balancer Unit - _proxyWS - no error",
function(test) {
  var req = {aa: 10};
  var socket = {bb: 10};
  var head = {cc: 10};
  var endpoint = "http://aa.com:8000";
  var cookies = {};

  var target = {
    host: "aa.com",
    port: "8000"
  };
  var options = {target: target};

  var proxyMock = sinon.mock(Balancer.proxy);
  proxyMock.expects("ws").once().withArgs(req, socket, head, options);

  Balancer._proxyWs(req, socket, head, endpoint);

  Meteor._sleepForMs(50);

  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
"Balancer Unit - _proxyWS - with error",
function(test) {
  var req = {aa: 10};
  var socket = {bb: 10};
  var head = {cc: 10};
  var endpoint = "http://aa.com:8000";
  var cookies = {};

  var target = {
    host: "aa.com",
    port: "8000"
  };
  var options = {target: target};
  var error = {message: "the-error-message"};

  var proxyMock = sinon.mock(Balancer.proxy);
  proxyMock.expects("ws")
    .once()
    .withArgs(req, socket, head, options)
    .callsArgWith(4, error);

  Balancer._proxyWs(req, socket, head, endpoint);

  Meteor._sleepForMs(50);

  proxyMock.verify();
  proxyMock.restore();
});

function WithDiscovery(newDiscovery, fn) {
  var oldDiscovery = ClusterManager.discovery;
  ClusterManager.discovery = newDiscovery;
  fn();
  ClusterManager.discovery = oldDiscovery;
}
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
    test.isTrue(discovery.pickEndpointHash.calledOnce);
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
    test.isTrue(discovery.pickEndpointHash.calledOnce);
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

function WithDiscovery(newDiscovery, fn) {
  var oldDiscovery = ClusterManager.discovery;
  ClusterManager.discovery = newDiscovery;
  fn();
  ClusterManager.discovery = oldDiscovery;
}
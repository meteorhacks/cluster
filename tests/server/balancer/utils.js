var format = Npm.require('util').format;

Tinytest.add("Balancer - _urlToTarget", function(test) {
  var url = "http://abc.hello.com:8000";
  var target = Balancer._urlToTarget(url);
  test.equal(target, {
    host: "abc.hello.com",
    port: "8000"
  });
});

Tinytest.add("Balancer - _pickAndSetEndpointHash - has endpoint",
function(test) {
  var hash = "the-hreash";
  var discovery = {
    pickEndpointHash: sinon.stub().returns(hash)
  };

  var uiService = "web";
  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      var cookies = {set: sinon.spy()};
      var result = Balancer._pickAndSetEndpointHash(cookies);

      var cookieName = Balancer._buildCookie('cluster-endpoint', uiService)
      test.equal(result, hash);
      test.isTrue(cookies.set.calledWith(cookieName, hash));
      test.isTrue(discovery.pickEndpointHash.calledWith(uiService));
    });
  });
});

Tinytest.add("Balancer - _pickAndSetEndpointHash - no endpoint",
function(test) {
  var hash = "the-hash";
  var discovery = {
    pickEndpointHash: sinon.stub().returns(null)
  };

  var uiService = "web";
  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetEndpointHash(cookies);

    test.equal(result, false);
    test.isFalse(cookies.set.called);
    test.isTrue(discovery.pickEndpointHash.calledWith(uiService));
    });
  });

  WithDiscovery(discovery, function() {
    var cookies = {set: sinon.spy()};
    var result = Balancer._pickAndSetEndpointHash(cookies);

    test.equal(result, false);
    test.isFalse(cookies.set.called);
    test.isTrue(discovery.pickEndpointHash.calledWith("web"));
  });
});

Tinytest.add(
"Balancer - _pickEndpoint - with nullHash and didn't get a hash",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var discovery = {
    hashToEndpoint: sinon.stub().returns(false)
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
"Balancer - _pickEndpoint - with nullHash and get a hash",
function(test) {
  var hash = "the-hash";
  var endpoint = "the-endpoint";
  var discovery = {
    hashToEndpoint: sinon.stub().returns(endpoint)
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
"Balancer - _pickEndpoint - have hash but no endpoint - retried",
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
"Balancer - _pickEndpoint - have hash but no endpoint - only one retry",
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
"Balancer - _pickJustEndpoint - no hash provided",
function(test) {
  var endpoint = "end-point";
  var uiService = "web";

  var discovery = {
    pickEndpoint: sinon.stub()
      .returns(endpoint)
  }

  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      var result = Balancer._pickJustEndpoint(null, uiService);
      test.equal(result, endpoint);
      test.isTrue(discovery.pickEndpoint.calledWith(uiService));
    });
  });
});

Tinytest.add(
"Balancer - _pickJustEndpoint - hash provided, has endpoint",
function(test) {
  var endpoint = "end-point";
  var hash = "the-hash";
  var uiService = "web";
  var discovery = {
    hashToEndpoint: sinon.stub().returns(endpoint)
  }

  WithDiscovery(discovery, function() {
    var result = Balancer._pickJustEndpoint(hash, uiService);
    test.equal(result, endpoint);
    test.isTrue(discovery.hashToEndpoint.calledWith(hash));
  });
});

Tinytest.add(
"Balancer - _pickJustEndpoint - hash provided, no endpoint",
function(test) {
  var endpoint = "end-point";
  var hash = "the-hash";
  var uiService = "web";
  var discovery = {
    hashToEndpoint: sinon.stub().returns(false),
    pickEndpoint: sinon.stub().returns(endpoint)
  }

  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      var result = Balancer._pickJustEndpoint(hash, uiService);
      test.equal(result, endpoint);

      test.isTrue(discovery.hashToEndpoint.calledWith(hash));
      test.isTrue(discovery.pickEndpoint.calledWith(uiService));
    });
  });
});

Tinytest.add(
"Balancer - _proxyWeb - no error",
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
"Balancer - _proxyWeb - error and we drop the original connection.",
function(test) {
  var req = {aa: 10};
  var res = {
    headersSent: true,
    end: sinon.stub(),
    writeHead: sinon.stub()
  };
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
    .exactly(1)
    .withArgs(req, res, options)
    .onCall(0).callsArgWith(3, error);

  Balancer._proxyWeb(req, res, endpoint, cookies);

  test.equal(res.end.callCount, 0);
  test.equal(res.writeHead.callCount, 0);
  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
"Balancer - _proxyWeb - sockjs long polling support",
function(test) {
  var req = {url: "/sockjs/something-else"};
  var res = {bb: 10, setTimeout: sinon.stub()};
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
    .exactly(1)
    .withArgs(req, res, options);

  Balancer._proxyWeb(req, res, endpoint, cookies);

  Meteor._sleepForMs(50);

  test.isTrue(res.setTimeout.calledWith(2 * 60 * 1000));

  proxyMock.verify();
  proxyMock.restore();
});

Tinytest.add(
'Balancer - _setFromBalanceUrlHeader',
function(test) {
  var req = {headers: {}};
  Balancer._setFromBalanceUrlHeader(req);
  test.equal(req.headers, {"from-balancer": "YES"});
});

Tinytest.add(
'Balancer - _rewriteDdpUrl - cluster ddp urls',
function(test) {
  var hash = "somehash56";
  var originalSockJsUrl = "/sds/998";
  var url = format('/cluster-ddp/%s/web/%s', hash, originalSockJsUrl);

  var req = {url: url};
  var hash = Balancer._rewriteDdpUrl(req)
  test.equal(hash, hash);
  test.equal(req.url, "/sockjs" + originalSockJsUrl);
});

Tinytest.add(
'Balancer - _rewriteDdpUrl - remove unwanted slashes',
function(test) {
  var hash = "somehash56";
  var originalSockJsUrl = "/sds/998/";
  var url = format('/cluster-ddp/%s/web///%s///', hash, originalSockJsUrl);

  var req = {url: url};
  var hash = Balancer._rewriteDdpUrl(req)

  test.equal(hash, hash);
  test.equal(req.url, "/sockjs" + originalSockJsUrl);
});


Tinytest.add(
'Balancer - _rewriteDdpUrl - some other urls',
function(test) {
  var url = "someUrl"
  var req = {url: url};
  var hash = Balancer._rewriteDdpUrl(req)
  test.equal(hash, undefined);
  test.equal(req.url, url);
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, web, with balancer',
function(test) {
  var balancer = "http://balancer.com";
  var endpoint = "epoint";
  var hash = "hashhh";
  var uiService = "web";
  var discovery = {
    endpointToHash: sinon.stub().returns(hash),
    pickBalancer: sinon.stub().returns(balancer),
  };

  var cookies = {
    get: sinon.stub().returns(hash)
  };

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(hash, "web")
    .returns(endpoint);

  var req = {url: "/web/sockjs/info"};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      Balancer._sendSockJsInfo(req, res, cookies);

      test.isTrue(discovery.endpointToHash.calledWith(endpoint));
      var info = JSON.parse(res.end.firstCall.args[0]);
      test.equal(info.base_url, format("%s/cluster-ddp/%s/web", balancer, hash));
      test.equal(info.websocket, true);

      balancerMock.verify();
      balancerMock.restore();
    });
  });
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, web, with no balancer',
function(test) {
  var balancer = null;
  var endpoint = "epoint";
  var hash = "hashhh";
  var uiService = "web";
  var discovery = {
    endpointToHash: sinon.stub().returns(hash),
    pickBalancer: sinon.stub().returns(balancer),
  };

  var cookies = {
    get: sinon.stub().returns(hash)
  };

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(hash, "web")
    .returns(endpoint);

  var req = {url: "/web/sockjs/info"};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithNew(process.env, {"ROOT_URL": endpoint}, function() {
    WithCluster({_uiService: uiService}, function() {
      WithDiscovery(discovery, function() {
        Balancer._sendSockJsInfo(req, res, cookies);

        test.isTrue(discovery.endpointToHash.calledWith(endpoint));
        var info = JSON.parse(res.end.firstCall.args[0]);
        test.equal(info.base_url, format(endpoint + "/cluster-ddp/%s/web", hash));
        test.equal(info.websocket, true);

        balancerMock.verify();
        balancerMock.restore();
      });
    });
  });
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, web, with no balancer, endpoint has sub path',
function(test) {
  var balancer = null;
  // endpoint has a sub path
  var endpoint = "http://localhost:8001/private";
  var hash = "hashhh";
  var uiService = "web";
  var discovery = {
    endpointToHash: sinon.stub().returns(hash),
    pickBalancer: sinon.stub().returns(balancer),
  };

  var cookies = {
    get: sinon.stub().returns(hash)
  };

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(hash, "web")
    .returns(endpoint);

  var req = {url: "/web/sockjs/info"};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithNew(process.env, {"ROOT_URL": endpoint}, function() {
    WithCluster({_uiService: uiService}, function() {
      WithDiscovery(discovery, function() {
        Balancer._sendSockJsInfo(req, res, cookies);

        test.isTrue(discovery.endpointToHash.calledWith(endpoint));
        var info = JSON.parse(res.end.firstCall.args[0]);
        test.equal(info.base_url, format(endpoint + "/cluster-ddp/%s/web", hash));
        test.equal(info.websocket, true);

        balancerMock.verify();
        balancerMock.restore();
      });
    });
  });
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, public service, with balancer',
function(test) {
  var balancer = "http://balancer.com";
  var endpoint = "epoint";
  var hash = "hashhh";
  var serviceName = Random.id();

  var discovery = {
    endpointToHash: sinon.stub().returns(hash),
    pickBalancer: sinon.stub().returns(balancer),
  };

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(null, serviceName)
    .returns(endpoint);

  var req = {url: format("/%s/sockjs/info", serviceName)};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithDiscovery(discovery, function() {
    Cluster.allowPublicAccess(serviceName)
    Balancer._sendSockJsInfo(req, res);

    test.isTrue(discovery.endpointToHash.calledWith(endpoint));
    var info = JSON.parse(res.end.firstCall.args[0]);
    var expectedUrl =
      format("%s/cluster-ddp/%s/%s", balancer, hash, serviceName);
    test.equal(info.base_url, expectedUrl);
    test.equal(info.websocket, true);

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, private service, with balancer',
function(test) {
  var balancer = "http://balancer.com";
  var endpoint = "epoint";
  var hash = "hashhh";
  var serviceName = Random.id();

  var discovery = {
    pickBalancer: sinon.stub().returns(balancer),
  };

  var balancerMock = sinon.mock(Balancer);

  var req = {url: format("/%s/sockjs/info", serviceName)};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithDiscovery(discovery, function() {
    Balancer._sendSockJsInfo(req, res);

    var calledArg = res.end.firstCall.args[0];
    test.isTrue(/no such/.test(calledArg));

    balancerMock.verify();
    balancerMock.restore();
  });
});

Tinytest.add(
'Balancer - _sendSockJsInfo - correct base_url, web, with balancer, no WS',
function(test) {
  var balancer = "http://balancer.com";
  var endpoint = "epoint";
  var hash = "hashhh";
  var uiService = "web";
  var discovery = {
    endpointToHash: sinon.stub().returns(hash),
    pickBalancer: sinon.stub().returns(balancer),
  };

  var cookies = {
    get: sinon.stub().returns(hash)
  };

  var balancerMock = sinon.mock(Balancer);
  balancerMock.expects('_pickJustEndpoint')
    .withArgs(hash, "web")
    .returns(endpoint);

  var req = {url: "/web/sockjs/info"};
  var res = {writeHead: sinon.stub(), end: sinon.stub()};

  WithCluster({_uiService: uiService}, function() {
    WithDiscovery(discovery, function() {
      var originalEnv = process.env;
      process.env['DISABLE_WEBSOCKETS'] = "1";

      Balancer._sendSockJsInfo(req, res, cookies);

      delete process.env['DISABLE_WEBSOCKETS'];

      test.isTrue(discovery.endpointToHash.calledWith(endpoint));
      var info = JSON.parse(res.end.firstCall.args[0]);
      test.equal(info.base_url, format("%s/cluster-ddp/%s/web", balancer, hash));
      test.equal(info.websocket, false);

      balancerMock.verify();
      balancerMock.restore();
    });
  });
});

Tinytest.add(
"Balancer - _proxyWS - no error",
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
"Balancer - _proxyWS - with error",
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
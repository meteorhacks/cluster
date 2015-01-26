OverShadowServerEvent = function OverShadowServerEvent(event, handler) {
  var httpServer = Package.webapp.WebApp.httpServer;
  var oldHttpServerListeners = httpServer.listeners(event).slice(0);
  httpServer.removeAllListeners(event);

  var newListener = function(request /*, moreArguments */) {
    // Store arguments for use within the closure below
    var args = arguments;
    if(handler.apply(httpServer, args) !== true) {
      _.each(oldHttpServerListeners, function(oldListener) {
        oldListener.apply(httpServer, args);
      });
    };
  };
  httpServer.addListener(event, newListener);
}
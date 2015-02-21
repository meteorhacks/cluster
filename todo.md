# Todo

Error handling when proxing (now it crashes the server)
try to make the code reusable
test balancer code
try to make the use of balancer
try to send services to the client and publications
with that try to load balance locally, when a server got disconnected
test new changes to the balancer
test store
backend registrations
auto config
make cookie reset time to be around 1hour
remove the mongo-livedata dependency and use mongodb node driver
- add the support to query expired entries locally - to handle when the MongoDB goes down
- verbose mode for logging
-   so we can assume better distribution
- do that for WS as well
- load balance direct WS connections too
- support websocket URL based service delivery
- load balance direct websocket connections (both web and discovery)
- add an special api to reblance requests

# Multi Core Support

Add proxy support for static files

* If the file has a .xxx extension then don't proxy
* For other, if there is fast-render then proxy 
* Othewise don't

Add proxy support for SockJS
Add better worker management
    * If exit okay, then simply simply do a messgae and don't start the worker
    * Add a retry logic to restart the worker 
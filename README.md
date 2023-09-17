# TestWebsockets

This is the Client Branch.

Client: This is the final result that shows a way to set up a WebSocket client capable of connecting to different websocket paths, and that survives after various events such as: 
    * Client Network drops
    * Client going to sleep, or client loosing focus
    * Server Disconnects
    * Server network drops.

The client can be run locally using Angular's ng serve command, or it can be run on a server using the ng build command to create a dist folder that can be served by a web server.
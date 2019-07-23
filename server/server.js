const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const bodyParser = require("body-parser");
const path = require("path");

const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerOptions = require('./config/swagger');
const expressSwagger = require('express-swagger-generator')(app);

app.use(require('./config/passport').passport.initialize());

// Swagger will display documentation at the url /api-docs
expressSwagger(swaggerOptions);

// Allows us to view the auto-generated swagger.json
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpecs);
});

// parse application/x-www-form-urlencoded
// for easier testing with Postman or plain HTML forms
// parse application/json - needs higher limit for passing img for annotation
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.set("port", process.env.PORT || 3001);

// Connect all our routes to our application
app.use('/api', routes);

// This websocket sends a list of videos to the client that update in realtime
io.on("connection", socket => {
  console.log("socket connected!");
  socket.on("connect_failed", () => {
    console.log("socket connection failed");
  });
  socket.on("disconnect", () => {
    console.log("socket disconnected");
  });
  socket.on("refresh videos", () => {
    socket.broadcast.emit("refresh videos");
  });
  socket.on("refresh predictmodel", () => {
    socket.broadcast.emit("refresh predictmodel");
  });
  socket.on("refresh trainmodel", () => {
    //Model Tab: Train info needs to be updated
    socket.broadcast.emit("refresh trainmodel");
  });
});

// Express only serves static assets in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client", "build")));
  app.get("/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "build", "index.html"));
  });
}

// No endpoint found, 404
app.use(function(req, res) {
   res.status(404).end();
});


server.listen(app.get("port"), () => {
  console.log(`Find the server at: http://localhost:${app.get("port")}/`);
});

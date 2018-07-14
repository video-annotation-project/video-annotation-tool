const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const _ = require('lodash');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportJWT = require('passport-jwt');
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

var fakeUsers = [
  {
    id: 1,
    username: 'test',
    password: '123'
  },
  {
    id: 2,
    username: 'boi',
    password: 'lol'
  }
];

var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = 'Bernie wouldve won';

var strategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  console.log('payload received', jwt_payload);
  // usually this would be a database call:
  var user = fakeUsers[_.findIndex(fakeUsers, {id: jwt_payload.id})];
  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
});

passport.use(strategy);

const app = express();

app.use(passport.initialize());

// parse application/x-www-form-urlencoded
// for easier testing with Postman or plain HTML forms
app.use(bodyParser.urlencoded({
  extended: true
}));
// parse application/json
app.use(bodyParser.json())

app.post("/login", function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.status(401).json({
      message: "Invalid parameters: username and password required"
    });
    return;
  }
  var username = req.body.username;
  var password = req.body.password;

  // usually this would be a database call:
  var user = fakeUsers[_.findIndex(fakeUsers, {username: username})];
  if (!user){
    res.status(401).json({message:"username not found"});
    return;
  }
  if (user.password !== req.body.password) {
    res.status(401).json({message:"wrong password"});
    return;
  }

  // from now on we'll identify the user by the id and the id is the only
  // personalized value that goes into our token
  var payload = {id: user.id};
  var token = jwt.sign(payload, jwtOptions.secretOrKey);
  res.json({message: "welcome", token: token});
});

app.get('/api', (req, res) => {
  res.json('Test API reponse sent from Node js server');
});

app.get('/protected', passport.authenticate('jwt', {session: false}),
  (req, res) => {
    res.json("Success! You possess a valid authorization token.");
  }
);

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  app.get('/*', (req, res) =>  {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

app.set('port', (process.env.PORT || 3001));

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});

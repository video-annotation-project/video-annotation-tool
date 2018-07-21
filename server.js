const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const _ = require('lodash');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportJWT = require('passport-jwt');
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const bcrypt = require('bcrypt');
const psql = require('./db/simpleConnect');

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

async function findUser(userId) {
  queryPass = 'select id, username, password, admin from users where users.id=$1';
  const user = await psql.query(queryPass,[userId]);
  if (user.rows.length == 1) {
    return user.rows[0];
  } else {
    return false;
  }
}

async function userLogin(username, password) {
  queryPass = 'select id, password, admin from users where users.username=$1';

  const user = await psql.query(queryPass,[username]);
  if (user.rows.length > 1) {
    return -1;
  }
  if (user.rows.length == 0) {
    return 1;
  }
  const res = await bcrypt.compare(password,user.rows[0].password);
  if (res) {
    return user.rows[0];
  } else {
    return 2;
  }
}

var strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {
  console.log('payload received', jwt_payload);

  var user = await findUser(jwt_payload.id);
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

app.post("/login", async function(req, res) {
  if (!req.body.username || !req.body.password) {
    res.json({
      message: "Invalid parameters: username and password required"
    });
    return;
  }
  var username = req.body.username;
  var password = req.body.password;
  var choice = await userLogin(username, password);
  switch(choice) {
    case -1:
      res.json({message: "sorry, something went wrong"});
      break;
    case 1:
      res.json({message:"username not found"});
      break;
    case 2:
      res.json({message:"wrong password"});
      break;
    default:
        var payload = {id: choice.id};
        var token = jwt.sign(payload, jwtOptions.secretOrKey);
        res.json({message: "welcome", token: token, admin: choice.admin});
        break;
   }

});

app.get('/api', (req, res) => {
  res.json('Test API reponse sent from Node js server');
});

app.get('/api/concepts', passport.authenticate('jwt', {session: false}),
  (req, res) => {
    res.json('You have been authorized to view some juicy concepts.');
  }
);

app.get('/api/annotate', passport.authenticate('jwt', {session: false}),
  (req, res) => {
    res.json("You have been authorized to do some sweet annotation.");
  }
);

//Code for create users
app.post('/createUser', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    if(req.user.admin) {
      queryText = "INSERT INTO users(username, password, admin) VALUES($1, $2, $3) RETURNING *"
      const saltRounds = 10;
      try {
        var hash = await bcrypt.hash(req.body.password, saltRounds);
      } catch (error) {
          res.json({message: "error hashing" + error.message})
          res.end()
      }
      try {
        const insertUser = await psql.query(queryText,[req.body.username, hash, req.body.admin]);
        res.json({message: "user created", user: insertUser.rows[0]});
      } catch (error) {
        res.json({message: "error inserting: " + error.message})
        res.end();
      }
    } else {
      res.status(401).json({message: "Must be admin to create new user!"})
      res.end();
    }
});

//Code for profile modification
app.post('/changePass', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    if (req.body.password1 != req.body.password2) {
      res.json({message: "New passwords not matching"});
      res.end();
    }
    queryPass = 'select password from users where users.username=$1';
    try {
      const currentPass = await psql.query(queryPass,[req.user.username]);
      try {
        const match = await bcrypt.compare(req.body.password, currentPass.rows[0].password);
        if (match) {
          const saltRounds = 10;
          const hash = await bcrypt.hash(req.body.password1, saltRounds);
          queryUpdate = 'UPDATE users SET password=$1 WHERE username=$2';
          try {
            const update = await psql.query(queryUpdate,[hash,req.user.username]);
            res.json({message: 'Changed'});
            res.end();
          } catch (error) {
            res.json({message: "error: " + error.message});
            res.end();
          }

        } else {
          res.json({message: "Wrong Password!"});
          res.end();
        }
      } catch (error) {
        res.json({message: "error: " + error.message});
        res.end();
      }

    } catch (error) {
      res.json({message: "error: " + error.message});
      res.end();
    }
  }
)

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

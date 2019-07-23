const psql = require("../db/simpleConnect");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const passportJWT = require("passport-jwt");
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;


let jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = process.env.JWT_KEY;

async function findUser(userId) {
  let queryPass = `
    SELECT
      id, username, password, admin
    FROM
      users
    WHERE
      users.id=$1
  `;
  const user = await psql.query(queryPass, [userId]);
  if (user.rows.length === 1) {
    return user.rows[0];
  } else {
    return false;
  }
}

let strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {
  // console.log('payload received', jwt_payload);
  let user = await findUser(jwt_payload.id);
  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
});

passport.use(strategy);

module.exports = { 
	passport, 
	jwtOptions,
};
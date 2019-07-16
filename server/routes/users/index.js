const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const jwtOptions = require('../../config/passport').jwtOptions
const setCookies = require('../../config/cookies')

router.use('/concepts', require('./concepts'))

/**
 * @api {get} /api/users/ Request list of all users
 * @apiName GetUsers
 * @apiGroup users
 *
 *
 * @apiSuccess {Object[]}          List of user information.
 * @apiSuccess {Number}   id       ID of the user.
 * @apiSuccess {String}   username Username of the user.
 */
 
/**
* @swagger
* /users:
*    get:
*      description: This should return all users
*/
router.get("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT DISTINCT 
        u.id, u.username 
      FROM 
        users u
      JOIN 
        annotations a ON a.userid=u.id
    `;

    if (req.query.noAi === "true") {
      queryText += ` WHERE u.username NOT IN ('tracking', 'ai')`;
    }

    queryText += ` ORDER BY u.username`;

    try {
      const users = await psql.query(queryText);
      res.json(users.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @api {post} /api/users/ Create a new user
 * @apiName PostUser
 * @apiGroup users
 *
 *
 * @apiSuccess {String}  message       "user created"
 * @apiSuccess {Object}  user          Created user object
 * @apiSuccess {Number}  user.id       User ID.
 * @apiSuccess {Boolean} user.username Username.
 * @apiSuccess {Boolean} user.password Password.
 * @apiSuccess {Boolean} user.admin.   Is the user an admin.
 */
router.post("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        users (username, password, admin)
      VALUES
        ($1, $2, $3) 
      RETURNING *`;

    const saltRounds = 10;
    try {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const data = [req.body.username, hash, req.body.admin];
      const insertUser = await psql.query(queryText, data);
      res.json({ message: "user created", user: insertUser.rows[0] });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

/**
 * @api {post} /api/users/ Update a users password
 * @apiName ChangePassword
 * @apiGroup users
 *
 * @apiParam {String} username The login username.
 * @apiParam {String} password The login password.
 *
 * @apiSuccess {Number}  userid  ID of the user.
 * @apiSuccess {String}  token   Athentication token for the user.
 * @apiSuccess {Boolean} isAdmin Is the user an admin.
 */
router.patch("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const { password, newPassword1, newPassword2 } = req.body;
    const username = req.user.username;
    const queryPass = `SELECT password FROM users WHERE users.username=$1`;
    try {
      const currentPass = await psql.query(queryPass, [username]);
      if (!(await bcrypt.compare(password, currentPass.rows[0].password))) {
        res.status(400).json({ detail: "Wrong Password!" });
        return;
      }
      const saltRounds = 10;
      const hash = await bcrypt.hash(newPassword1, saltRounds);
      let queryUpdate = `UPDATE users SET password=$1 WHERE username=$2`;
      await psql.query(queryUpdate, [hash, username]);
      res.json({ message: "Changed" });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @api {post} /api/users/login Login as a user
 * @apiName UserLogin
 * @apiGroup users
 *
 * @apiParam {String} username The login username.
 * @apiParam {String} password The login password.
 *
 * @apiSuccess {Number}  userid  ID of the user.
 * @apiSuccess {String}  token   Athentication token for the user.
 * @apiSuccess {Boolean} isAdmin Is the user an admin.
 */
router.post("/login", async function(req, res) {
  const { username, password } = req.body;
  let queryPass = `
    SELECT 
      id, password, admin
    FROM 
      users 
    WHERE
      users.username=$1
  `;
  try {
    const user = await psql.query(queryPass, [username]);
    if (user.rowCount === 0) {
      res.status(400).json({ detail: "No username found" });
      return;
    }
    if (!(await bcrypt.compare(password, user.rows[0].password))) {
      res.status(400).json({ detail: "wrong password" });
      return;
    }
    const payload = { id: user.rows[0].id };
    const token = jwt.sign(payload, jwtOptions.secretOrKey);
    setCookies(res);
    res.json({
      userid: user.rows[0].id,
      token: token,
      isAdmin: user.rows[0].admin
    });
  } catch (error) {
    console.log("Error in post /api/login");

    console.log(error);

    res.status(500).json(error);
  }
});


/**
 * @api {post} /api/users/annotations Create a new user
 * @apiName PostUser
 * @apiGroup users
 *
 * @apiParam {String} id       The Users-ID.
 * @apiParam {String} fromdate Start date of annotations.
 * @apiParam {String} todate   End date of annotations.
 *
 * @apiSuccess {Object[]}          	  List of concept info
 * @apiSuccess {Number}   conceptid   Concept ID of the annotation.
 * @apiSuccess {String}   name        Name of the concept.
 * @apiSuccess {Number}   total_count Amount of concept that have been annotated.
 */
router.get("/annotations", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = parseInt(req.query.userid);
    const fromDate = req.query.fromdate;
    const toDate = req.query.todate;
    const data = [userId, fromDate, toDate];

    if (!userId) {
      res.status(400);
    }

    const queryText = `
      SELECT DISTINCT
        A.conceptid, C.name, COUNT(A.conceptid) AS total_count
      FROM 
        annotations A
      LEFT JOIN 
        concepts C ON A.conceptid = C.id
      WHERE 
        A.userid = $1 AND (A.dateannotated BETWEEN $2 AND $3)
      GROUP BY A.conceptid, C.name`;
    try {
      let response = await psql.query(queryText, data);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/users/annotations");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

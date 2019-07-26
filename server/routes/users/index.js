const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const jwtOptions = require('../../config/passport').jwtOptions;
const setCookies = require('../../config/cookies');

router.use('/concepts', require('./concepts'));

/**
 * @typedef Error
 * @property {string} detail.required
 */

/**
 * @typedef userInfo
 * @property {integer} id - ID of user
 * @property {string} username - username of user
 */

/**
 * @route GET /api/users
 * @group users
 * @summary Get a list of all users
 * @param {string} noAi.query - Exclude tracking and ai users
 * @returns {Array.<userInfo>} 200 - An array of user info
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT DISTINCT 
        u.id, u.username 
      FROM 
        users u
      JOIN 
        annotations a ON a.userid=u.id
    `;

    if (req.query.noAi === 'true') {
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
 * @typedef user
 * @property {integer} id - ID of created user
 * @property {string} username - Username of created user
 * @property {string} password - Password of created user
 * @property {boolean} admin - Is the created user an admin
 */

/**
 * @typedef userCreated
 * @property {string} message - "user created"
 * @property {user.model} id - ID of user
 */

/**
 * @route POST /api/users
 * @group users
 * @summary Create a new user
 * @param {string} username.body.required - Username of new user
 * @param {string} password.body.required - Password of new user
 * @param {string} admin.body.required - Is the user an admin
 * @returns {userCreated.model} 200 - Created user info
 * @returns {Error} 500 - Unexpected database error
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
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
      res.json({ message: 'user created', user: insertUser.rows[0] });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef message
 * @property {string} message - "Changed"
 */

/**
 * @route PATCH /api/users
 * @group users
 * @summary Change a user's password
 * @param {string} password.body.required - Password of new user
 * @param {string} newPassword1.body.required - Password of new user
 * @param {string} newPassword2.body.required - Password of new user
 * @returns {message.model} 200 - Success message
 * @returns {Error} 500 - Unexpected database error
 */
router.patch(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { password, newPassword1, newPassword2 } = req.body;
    const username = req.user.username;
    const queryPass = `SELECT password FROM users WHERE users.username=$1`;
    try {
      const currentPass = await psql.query(queryPass, [username]);
      if (!(await bcrypt.compare(password, currentPass.rows[0].password))) {
        res.status(400).json({ detail: 'Wrong Password!' });
        return;
      }
      const saltRounds = 10;
      const hash = await bcrypt.hash(newPassword1, saltRounds);
      let queryUpdate = `UPDATE users SET password=$1 WHERE username=$2`;
      await psql.query(queryUpdate, [hash, username]);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef userLogin
 * @property {integer} id - ID of logged in user
 * @property {string} token - Authentication token
 * @property {boolean} isAdmin - Is the logged in user an admin
 */

/**
 * @route POST /api/users/login
 * @group users
 * @summary Log-in a user
 * @param {string} username.body.required - Username of new user
 * @param {string} password.body.required - Password of new user
 * @returns {userLogin.model} 200 - Logged in user info
 * @returns {Error.model} 400 - Error with login
 * @returns {Error} 500 - Unexpected database error
 */
router.post('/login', async function(req, res) {
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
      res.status(400).json({ detail: 'No username found' });
      return;
    }
    if (!(await bcrypt.compare(password, user.rows[0].password))) {
      res.status(400).json({ detail: 'wrong password' });
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
    console.log('Error in post /api/login');

    console.log(error);

    res.status(500).json(error);
  }
});

/**
 * @typedef annotationInfo
 * @property {integer} conceptid - ID of concept
 * @property {string} name - Authentication token
 * @property {boolean} total_count - Number of annotations for this concept
 */

/**
 * @route GET /api/users/annotaions
 * @group users
 * @summary Get a users annotations
 * @param {integer} userid.query.required - User id to get annotations
 * @param {string} fromdate.query.required - Beginning date of annotations
 * @param {string} todate.query.required - End date of annotations
 * @returns {Array.<annotationInfo>} 200 - Logged in user info
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/annotations',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const userId = parseInt(req.query.userid);
    const fromDate = req.query.fromdate;
    const toDate = req.query.todate;
    const data = [userId, fromDate, toDate];

    if (!userId) {
      res.status(400);
    }

    const queryText = `
      SELECT 
        conceptid,
        name,
        CASE WHEN verification_count IS NULL THEN
          0 
        ELSE 
          verification_count END AS verification_count,
        CASE WHEN annotation_count IS NULL THEN
          0 
        ELSE 
          annotation_count END AS annotation_count
      FROM
        (
          SELECT DISTINCT
            A.conceptid, C.name, COUNT(A.conceptid) AS annotation_count
          FROM
            annotations A
          LEFT JOIN
            concepts C ON A.conceptid = C.id
          WHERE
            A.userid = $1 AND (A.dateannotated BETWEEN $2 AND $3)
          GROUP BY A.conceptid, C.name
        ) AS AC
      NATURAL FULL JOIN 
        (
          SELECT DISTINCT
            A.conceptid, C.name, COUNT(A.conceptid) AS verification_count
          FROM
            annotations A
          LEFT JOIN
            concepts C ON A.conceptid = C.id
          WHERE
            A.verifiedby = $1 AND (A.verifieddate BETWEEN $2 AND $3)
          GROUP BY A.conceptid, C.name
        ) VC
      ORDER BY 
        name
    `;
    try {
      let response = await psql.query(queryText, data);
      res.json(response.rows);
    } catch (error) {
      console.log('Error on GET /api/users/annotations');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

const router = require("express").Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

/**
 * @typedef concept
 * @property {integer} id - ID of the concept
 * @property {integer} userid - ID of the user
 * @property {integer} conceptid - ID of the concept
 * @property {integer} conceptidx - ID of selection
 * @property {string} name - Name of the concept
 * @property {string} rank - Rank of the concept
 * @property {integer} parent - Parent concept ID
 * @property {string} picture - Filename of picture representation
 * @property {integer} collectionid - ID of the collection this concept is a part of
 * @property {integer} deleted_flag - True if this concept has been deleted
 * @property {integer} description - Description of the concept
 */

/**
 * @route GET /api/users/concepts
 * @group users
 * @summary Get the logged in user's selected concepts
 * @returns {Array.<concept>} 200 - Logged in user's selected concepts
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT
        *
      FROM
        profile
      LEFT JOIN
        concepts ON concepts.id=profile.conceptid
      WHERE
        profile.userid=$1
      ORDER BY
        profile.conceptidx, concepts.name
    `;
    try {
      let concepts = await psql.query(queryText, [req.user.id]);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef conceptInsert
 * @property {string} value - Stringified array representing the inserted row eg.
 * "[{\"id\":284,\"userid\":4,\"conceptid\":100,\"conceptidx\":0}]"
 */

/**
 * @route POST /api/users/concepts
 * @group users
 * @summary Add a concept to the user's selected concepts
 * @param {integer} id.body.required - Concept id to add
 * @returns {conceptInsert.model} 200 - Values of inserted row
 * @returns {Error} 500 - Unexpected database error
 */
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        profile (userid, conceptid)
      VALUES
        ($1, $2)
      RETURNING *
    `;
    try {
      let insert = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({ value: JSON.stringify(insert.rows) });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef conceptDelete
 * @property {string} value - Stringified array representing the inserted row eg.
 * "value": "[{\"id\":284,\"userid\":4,\"conceptid\":100,\"conceptidx\":0}]"
 */

/**
 * @route DELETE /api/users/concepts
 * @group users
 * @summary Delete a concept from a user's selected concepts
 * @param {integer} id.body.required - Concept id to delete
 * @returns {conceptDelete.model} 200 - Values of deleted rows
 * @returns {Error} 500 - Unexpected database error
 */
router.delete(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      DELETE FROM
        profile
      WHERE
        profile.userid=$1 AND profile.conceptid=$2
      RETURNING *
    `;
    try {
      let del = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({ value: JSON.stringify(del.rows) });
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

/**
 * @typedef conceptPatch
 * @property {string} value - Stringified array representing the inserted row eg.
 * "value": "[]"
 */

/**
 * @route PATCH /api/users/concepts
 * @group users
 * @summary Re-order a user's selected concepts
 * @param {Array.<concept>} conceptsSelected.body.required - New concept ids order
 * @returns {conceptPatch.model} 200 - Values of updated rows
 * @returns {Error} 500 - Unexpected database error
 */
router.patch(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const conceptsSelected = JSON.stringify(req.body.conceptsSelected);
    const queryText = `
      UPDATE 
        profile AS p
      SET
        conceptidx=c.conceptidx
      FROM 
        json_populate_recordset(null::profile,'${conceptsSelected}') AS c
      WHERE
        c.userid=p.userid AND c.conceptid=p.conceptid
    `;
    try {
      let update = await psql.query(queryText);
      res.json({ value: JSON.stringify(update.rows) });
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

module.exports = router;

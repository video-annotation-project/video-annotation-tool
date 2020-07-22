const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

/**
 * @route GET /api/collections/concepts
 * @group collections
 * @summary Get all concept collections and its concepts
 * @returns {Array.<object>} 200 - An array of every concept collection
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let queryText = `
    SELECT
      cc.id, cc.name, cc.description,
      json_agg(json_build_object('id', ci.conceptid, 'name', c.name, 'picture', c.picture)) as concepts,
      array_agg(ci.conceptid) as conceptids
    FROM
      concept_collection cc
    LEFT JOIN
      concept_intermediate ci
    ON
      cc.id = ci.id
    LEFT JOIN
      concepts c
    ON
      ci.conceptid = c.id
    GROUP BY
      cc.id, cc.name, cc.description
    ORDER BY
      cc.name;
    `;

    try {
      let conceptCollections = await psql.query(queryText);
      res.json(conceptCollections.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route POST /api/collections/concepts
 * @group collections
 * @summary Post a new concept collection
 * @param {string} name.body - Collection name
 * @param {string} description.body - Collection description
 * @returns {Success} 200 - Concept collection created
 * @returns {Error} 500 - Unexpected database error
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText1 = `
      INSERT INTO 
        concept_collection (name, description)
      VALUES
        ($1, $2)
      RETURNING *
    `;

    const queryText2 = `
      INSERT INTO
        concepts (id, name, parent)
      VALUES
        ($1, $2, -1)
    `;

    try {
      let insert = await psql.query(queryText1, [
        req.body.name,
        req.body.description
      ]);
      await psql.query(queryText2, [-insert.rows[0].id, req.body.name])
      res.json({ value: JSON.stringify(insert.rows) });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

/**
 * @route DELETE /api/collections/concepts/:id
 * @group collections
 * @summary Delete an concept collection
 * @param {String} id.params - Collection id
 * @returns {Success} 200 - Concept collection deleted
 * @returns {Error} 500 - Unexpected database error
 */
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText1 = `
      DELETE FROM 
        concept_collection
      WHERE
        id = $1
      RETURNING *
    `;

    const queryText2 = `
      DELETE FROM 
        concepts
      WHERE
        id = $1
    `;

    try {
      let deleted = await psql.query(queryText1, [req.params.id]);
      await psql.query(queryText2, [-req.params.id]);
      if (deleted) {
        res.json(deleted);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.post(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let params = [req.params.id];
    let queryText = `
      DELETE FROM
        concept_intermediate 
      WHERE 
        id=$1
    `;
    let queryText2 =
      req.body.concepts.length === 0
        ? ``
        : `
      INSERT INTO 
        concept_intermediate (id, conceptid)
      SELECT
        $1::INTEGER collectionid, *
      FROM
        UNNEST($2::INTEGER[])
    `;

    try {
      await psql.query(queryText, params);
      params.push(req.body.concepts);
      let added = await psql.query(queryText2, params);
      if (added) {
        res.status(200).json(added);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

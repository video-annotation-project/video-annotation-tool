const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const AWS = require('aws-sdk');

// returns a list of concept names
/**
 * @typedef conceptPatch
 * @property {string} value - Stringified array representing the inserted row eg.
 * "value": "[]"
 */

/**
 * @route GET /api/concepts
 * @group users
 * @summary Get all concepts
 * @param {Array.<concept>} conceptsSelected.body.required - New concept ids order
 * @returns {conceptPatch.model} 200 - Values of updated rows
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT *
      FROM concepts
      ORDER BY name
    `;
    try {
      const concepts = await psql.query(queryText);
      res.json(concepts.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.get(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    //   FROM ONLY
    //   concepts
    // NATURAL FULL JOIN
    //   concept_collection
    // WHERE
    //   deleted_flag IS NOT TRUE AND
    const queryText = `
      SELECT
        *
      FROM concepts
      WHERE
      parent=$1
    `;
    try {
      const concepts = await psql.query(queryText, [req.params.id]);
      res.json(concepts.rows);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

// in the future, this route as well as the /api/annotationImages route can
// be circumvented by using cloudfront
router.get('/images/:id', async (req, res) => {
  let s3 = new AWS.S3();
  const queryText = `SELECT picture FROM concepts WHERE concepts.id=$1`;
  try {
    const response = await psql.query(queryText, [req.params.id]);
    const picture = response.rows[0].picture;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: process.env.AWS_S3_BUCKET_CONCEPTS_FOLDER + `${picture}`
    };
    s3.getObject(params)
      .createReadStream()
      .pipe(res);
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get(
  '/path/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const path = [];
    let conceptid = req.params.id;
    const queryText = `SELECT * FROM concepts WHERE id=$1`;

    try {
      while (conceptid) {
        const concept = await psql.query(queryText, [conceptid]);
        path.unshift(concept.rows[0].name);
        conceptid = concept.rows[0].parent;
      }
      res.json(path);
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

module.exports = router;

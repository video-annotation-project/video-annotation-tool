const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let queryText = `
    SELECT
      ac.*
    FROM
      annotation_collection ac
    ORDER BY
      ac.name
    `;

    try {
      let annotationCollections = await psql.query(queryText);
      res.json(annotationCollections.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        annotation_collection (name, description)
      VALUES
        ($1, $2)
      RETURNING *
    `;
    try {
      let insert = await psql.query(queryText, [
        req.body.name,
        req.body.description
      ]);
      res.json({ value: JSON.stringify(insert.rows) });
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      DELETE FROM 
        annotation_collection
      WHERE
        id = $1
      RETURNING *
    `;
    try {
      let deleted = await psql.query(queryText, [req.params.id]);
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
    let params = [parseInt(req.params.id)];

    let queryText1 = `      
      INSERT INTO
          annotation_intermediate (id, annotationid)
      (
        SELECT id, annotationid FROM (
            SELECT
              $1::INTEGER as id, A.id as annotationid
            FROM
              annotations A
    `;

    let queryText2 = `
      UPDATE
        annotation_collection
      SET
        users = (
          SELECT
            array_agg(DISTINCT u)
          FROM unnest(users || (
            SELECT
              array_agg(username)
            FROM
              users 
    `;

    if (params.length === 1) {
      queryText1 += ` WHERE `;
    } else {
      queryText1 += ` AND `;
    }

    params.push(req.body.selectedUsers);

    if (req.body.includeTracking) {
      queryText1 += `EXISTS ( 
          SELECT id, userid 
          FROM annotations 
          WHERE id=A.originalid 
          AND unsure = False
          AND userid::text = ANY($${params.length}))`;
    } else {
      queryText1 += `
          unsure = False
          AND userid::text = ANY($${params.length})`;
    }

    queryText2 += ` WHERE id = ANY($${params.length})`;

    queryText2 += `
      )) u),
      videos = (
        SELECT
          array_agg(DISTINCT v)
        FROM unnest(videos || (
          SELECT
             array_agg(id)
          FROM
             videos
    `;

    if (params.length === 1) {
      queryText1 += ` WHERE `;
    } else {
      queryText1 += ` AND `;
    }

    params.push(req.body.selectedVideos);

    queryText1 += ` videoid::text = ANY($${params.length}) `;
    queryText2 += ` WHERE id = ANY($${params.length})`;

    queryText2 += `
      )) v),
      concepts = (
        SELECT
            array_agg(DISTINCT u)
        FROM unnest(concepts || (
            SELECT
              array_agg(name)
            FROM
              concepts
    `;

    if (params.length === 1) {
      queryText1 += ` WHERE `;
    } else {
      queryText1 += ` AND `;
    }
    params.push(req.body.selectedConcepts);

    queryText1 += ` conceptid::text = ANY($${params.length}) `;
    queryText2 += ` WHERE id = ANY($${params.length})`;

    queryText1 += `
        ) as t(id, annotationid)
      WHERE
        NOT EXISTS (
          SELECT
            1
          FROM
            annotation_intermediate ai
          WHERE
            ai.id = t.id::INTEGER AND ai.annotationid = t.annotationid::INTEGER))
    `;

    queryText2 += ` )) u)`;

    if (req.body.includeTracking) {
      queryText2 += `, tracking = TRUE`;
    }

    queryText2 += ` WHERE id=$1`;

    try {
      let added = await psql.query(queryText1, params);
      if (added) {
        await psql.query(queryText2, params);
        res.status(200).json(added);
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

/**
 * @route GET /api/collections/annotations/train
 * @group collections
 * @summary Get a list of annotation collections that relates to model concepts id
 * @param {string} ids.query - conceptids from model
 * @returns {Array.<userInfo>} 200 - An array of annotation collections
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/train',
  passport.authenticate('jwt', { session: false }),

  async (req, res) => {
    let params = '{' + req.query.ids + '}';
    let queryText = `      
      SELECT 
        name, id, count(*), array_agg(conceptid) as ids, array_agg(conceptname) as concepts
      FROM
        (SELECT ac.name, a.conceptid, ai.id, count(a.conceptid), c.name as conceptname
      FROM 
        annotation_collection ac
      LEFT JOIN
        annotation_intermediate ai ON ac.id = ai.id
      LEFT JOIN 
        annotations a ON ai.annotationid = a.id
      LEFT JOIN concepts c ON a.conceptid = c.id
      WHERE 
        a.conceptid = ANY( $1::int[] )
      GROUP BY ac.name, a.conceptid, ai.id, c.name ) t
      GROUP BY name, id
    `;

    try {
      let data = await psql.query(queryText, [params]);
      if (data) {
        res.status(200).json(data.rows);
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

module.exports = router;

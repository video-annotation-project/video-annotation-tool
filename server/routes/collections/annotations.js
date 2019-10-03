const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

var configData = require('../../../config.json');

/**
 * @route GET /api/collections/annotations
 * @group collections
 * @summary Get all annotation collections and additional info if train param is true
 * @param {Boolean} train.query - If collections are for training
 * @returns {Array.<object>} 200 - An array of every annotation collection
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let queryText;
    if (req.query.train === 'true') {
      queryText = `
      SELECT 
          name, id, count(*), array_agg(conceptid) as ids, json_agg((conceptname, conceptid)) as concepts    
      FROM
      (SELECT ac.name, a.conceptid, ai.id, count(a.conceptid), c.name as conceptname
          FROM 
              annotation_collection ac
          FULL JOIN
              annotation_intermediate ai ON ac.id = ai.id
          LEFT JOIN 
              annotations a ON ai.annotationid = a.id
          LEFT JOIN concepts c ON a.conceptid = c.id
          GROUP BY ac.name, a.conceptid, ai.id, c.name ) t
      GROUP BY name, id
      `;
    } else {
      queryText = `
      SELECT
        ac.*
      FROM
        annotation_collection ac
      ORDER BY
        ac.name
    `;
    }

    try {
      let annotationCollections = await psql.query(queryText);
      res.status(200).json(annotationCollections.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route GET /api/collections/annotations/tracking/counts
 * @group collections
 * @summary Get all annotation collections and additional info if train param is true
 * @param {Array.<String>} selectedConcepts - List of concept ids
 * @param {Array.<String>} selectedUsers - List of user ids
 * @param {Array.<String>} selectedVideos - List of video ids
 * @returns {Array.<object>} 200 - Object {annotationcounts: #, trackingcounts: #}
 * @returns {Error} 500 - Unexpected database error
 */

router.get(
  '/trackingCounts',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { selectedConcepts, selectedUsers, selectedVideos } = req.query;

    const params = [selectedConcepts, selectedUsers, selectedVideos];

    const queryText = `
      WITH originalIds AS (
        SELECT
          id
        FROM 
          annotations as A
        WHERE
          conceptid::text = ANY($1)
          AND userid::text = ANY($2)
          AND videoid::text = ANY($3)
      )
      SELECT
        coalesce(
          SUM(CASE WHEN userid=32 THEN 1 ELSE 0 END), 0
        ) as trackingcount,
        coalesce(
          SUM(CASE WHEN userid!=32 THEN 1 ELSE 0 END), 0
        ) as annotationcount
      FROM 
        annotations
      WHERE 
        originalid = ANY(SELECT id from originalIds);
    `;

    try {
      let response = await psql.query(queryText, params);
      res.json(response.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route GET /api/collections/annotations/counts
 * @group collections
 * @summary Get the number of annotations for each concept in a group of annotation collections
 * @param {Array.<String>} ids.query - List of collection ids
 * @param {Array.<String>} validConcepts.query - List of concept ids to only show counts from
 * @returns {Array.<object>} 200 - An array of counts for every concept
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/counts',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const params = [req.query.ids];
    let queryText = `
     WITH counts AS (
       SELECT
         c.name,
         SUM(CASE WHEN u.username != 'tracking' THEN 1 ELSE 0 END) AS user,
         SUM(CASE WHEN u.username = 'tracking' THEN 1 ELSE 0 END) tracking,
         SUM(CASE WHEN u.username != 'tracking' AND a.verifiedby IS NOT null THEN 1 ELSE 0 END) verified_user,
         SUM(CASE WHEN u.username = 'tracking' AND a.verifiedby IS NOT null THEN 1 ELSE 0 END) verified_tracking,
         count(*) total
       FROM
         annotation_intermediate ai
       LEFT JOIN
         annotations a ON a.id = ai.annotationid
       LEFT JOIN
         users u ON u.id = a.userid
       LEFT JOIN
         concepts c ON c.id=a.conceptid
       WHERE
         ai.id::text = ANY($1)
   `;

    if (req.query.validConcepts) {
      queryText += ` AND a.conceptid::text = ANY($2)`;
      params.push(req.query.validConcepts);
    }

    queryText += `
       GROUP BY
         c.name
     )

     SELECT * FROM counts
     UNION ALL
     SELECT
       'TOTAL' as name,
       SUM(c.user) as user,
       SUM(c.tracking) as tracking,
       SUM(c.verified_user) as verified_user,
       SUM(c.verified_tracking) as verified_tracking,
       SUM(c.total) as total
     FROM
       counts c
   `;

    try {
      let counts = await psql.query(queryText, params);
      res.status(200).json(counts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route POST /api/collections/annotations
 * @group collections
 * @summary Post a new annotation collection
 * @param {string} name.body - Collection name
 * @param {string} description.body - Collection description
 * @returns {Success} 200 - Annotation collection created
 * @returns {Error} 500 - Unexpected database error
 */
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
      res.status(200).json(insert.rows[0]);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

/**
 * @route DELETE /api/collections/annotations/:id
 * @group collections
 * @summary Delete an annotation collection
 * @param {String} id.params - Collection id
 * @returns {Success} 200 - Annotation collection deleted
 * @returns {Error} 500 - Unexpected database error
 */
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
        res.status(200).json(deleted);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

/**
 * @route POST /api/collections/annotations/:id
 * @group collections
 * @summary Add an annotations to an annotation collection
 * @param {String} id.params - Collection id
 * @param {Array.<String>} selectedUsers.body - Array of user ids
 * @param {Array.<String>} selectedVideos.body - Array of video ids
 * @param {Array.<String>} selectedConcepts.body - Array of concept ids
 * @param {Boolean} includeTracking - whether to add tracking annotations or not
 * @returns {Success} 200 - Annotations added to collection
 * @returns {Error} 500 - Unexpected database error
 */
router.post(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const { selectedUsers, selectedVideos, selectedConcepts } = req.body;
    let params = [
      parseInt(req.params.id),
      selectedUsers,
      selectedVideos,
      selectedConcepts
    ];

    let queryText1 = `
      WITH originalIds AS (
        SELECT
          id
        FROM 
            annotations as A
        WHERE
            userid::TEXT = ANY($2)
            AND videoid::TEXT = ANY($3)
            AND conceptid::TEXT = ANY($4)
      )
      INSERT INTO
          annotation_intermediate (id, annotationid)
      (
        SELECT
          id, annotationid 
        FROM (
          SELECT
            $1::INTEGER as id, A.id as annotationid  
          FROM annotations A
          WHERE A.originalid = ANY(SELECT id from originalIds)
    `;

    if (req.body.includeTracking === false) {
      queryText1 += ` AND id=originalid`;
    }

    queryText1 += `
        ) t
        WHERE NOT EXISTS (
          SELECT
            1
          FROM
            annotation_intermediate ai
          WHERE
            ai.id=t.id::INTEGER AND ai.annotationid=t.annotationid::INTEGER)
      )
    `;

    const queryText2 = `
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
          WHERE id = ANY($2))) u),
        videos = (
          SELECT
          array_agg(DISTINCT v)
          FROM unnest(videos || (
          SELECT
              array_agg(id)
          FROM
              videos
          WHERE id = ANY($3))) v),
        concepts = (
          SELECT
              array_agg(DISTINCT c)
          FROM unnest(concepts || (
              SELECT
              array_agg(name)
              FROM
              concepts
          WHERE id = ANY($4))) c),
          conceptid = $4,
        tracking = $5
      WHERE
        id=$1
    `;

    try {
      let added = await psql.query(queryText1, params);
      if (added) {
        params.push(req.body.includeTracking);
        await psql.query(queryText2, params);
        res.status(200).json(added);
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

module.exports = router;

const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

var configData = require('../../../config.json');

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
      res.json(counts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

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
    let good_users = configData.ml.tracking_users.filter(x =>
      req.body.selectedUsers.includes(x.toString())
    );

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

    if (good_users.length > 0) {
      queryText1 += `
        AND EXISTS ( 
          SELECT id, userid 
          FROM annotations 
          WHERE id=A.originalid 
          AND unsure = False
          AND userid::text = ANY($${params.length}))`;
    } else {
      queryText1 += ` AND userid::text = ANY($${params.length})`;
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

module.exports = router;

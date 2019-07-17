const router = require("express").Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT
        ac.*,
        array_agg(ai.annotationid) as annotations
      FROM
        annotation_collection ac
      LEFT JOIN
        annotation_intermediate ai
      ON
        ac.id = ai.id
      LEFT JOIN
        annotations a ON ai.annotationid=a.id
      GROUP BY
        ac.id
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
  "/",
  passport.authenticate("jwt", { session: false }),
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
  "/:id",
  passport.authenticate("jwt", { session: false }),
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
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let params = [parseInt(req.params.id)];
    let queryText = `      
    INSERT INTO
        annotation_intermediate (id, annotationid)
    (
      SELECT id, annotationid FROM (
          SELECT
            $1::INTEGER as id, A.id as annotationid
          FROM
            annotations A
    `;

    if (req.body.selectedConcepts[0] !== "-1") {
      queryText += ` WHERE `;
      params.push(req.body.selectedConcepts);
      queryText += ` conceptid::text = ANY($${params.length}) `;
    }
    if (req.body.selectedVideos[0] !== "-1") {
      if (params.length === 1) {
        queryText += ` WHERE `;
      } else {
        queryText += ` AND `;
      }
      params.push(req.body.selectedVideos);
      queryText += ` videoid::text = ANY($${params.length}) `;
    }
    if (req.body.selectedUsers[0] !== "-1") {
      if (params.length === 1) {
        queryText += ` WHERE `;
      } else {
        queryText += ` AND `;
      }
      params.push(req.body.selectedUsers);
      if (req.body.includeTracking) {
        queryText += `EXISTS ( 
          SELECT id, userid 
          FROM annotations 
          WHERE id=A.originalid 
          AND unsure = False
          AND userid::text = ANY($${params.length}))`;
      } else {
        queryText += `
          unsure = False
          AND userid::text = ANY($${params.length})`;
      }
    }

    queryText += `
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

    try {
      let added = await psql.query(queryText, params);
      if (added) {
        res.status(200).json(added);
      }
    } catch (error) {
      res.status(500).json(error);
      console.log(error);
    }
  }
);

router.get(
  "/train",
  passport.authenticate("jwt", { session: false }),

  async (req, res) => {
    let queryText = `      
      SELECT name, id, count(*), array_agg(conceptid) as ids, array_agg(conceptname) 
      FROM
      (SELECT ac.name, a.conceptid, ai.id, count(a.conceptid), c.name as conceptname
      FROM annotation_collection ac
      LEFT JOIN
      annotation_intermediate ai
      ON ac.id = ai.id
      LEFT JOIN annotations a
      ON ai.annotationid = a.id
      LEFT JOIN concepts c
      ON a.conceptid = c.id
      WHERE a.conceptid IN (1629, 1210, 236, 383, 1133)
      GROUP BY ac.name, a.conceptid, ai.id, c.name ) t
      GROUP BY name, id
    `;

    try {
      let data = await psql.query(queryText, req.body.conceptids);
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

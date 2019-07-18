const router = require("express").Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
    SELECT
      cc.id, cc.name,
      cc.picture, cc.deleted_flag, cc.collectionid, cc.description,
      json_agg(json_build_object('id', ci.conceptid, 'name', c.name, 'picture', c.picture)) as concepts
    FROM
      concept_collection cc
    LEFT JOIN
      concept_intermediate ci
    ON
      cc.collectionid = ci.collectionid
    LEFT JOIN
      concepts c
    ON
      ci.conceptid = c.id
    GROUP BY
      cc.id, cc.name, cc.picture, cc.deleted_flag, cc.collectionid, cc.description
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

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      INSERT INTO 
        concept_collection (name, description, parent)
      VALUES
        ($1, $2, 0)
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

router.patch(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      UPDATE 
        concept_collection
      SET
        deleted_flag=TRUE
      WHERE
        collectionid=$1
      RETURNING *
    `;
    try {
      let deleted = await psql.query(queryText, [req.body.id]);
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
    let params = [req.params.id];
    let queryText = `
      DELETE FROM
        concept_intermediate 
      WHERE 
        collectionid=$1
    `;
    let queryText2 =
      req.body.concepts.length === 0
        ? ``
        : `
      INSERT INTO 
        concept_intermediate (collectionid, conceptid)
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

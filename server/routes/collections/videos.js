const router = require("express").Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

router.baseURL = "/collections/videos";

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT 
        vc.*, 
        json_agg((vi.videoid, v.filename)) as videos,
        array_agg(vi.videoid) as videoids
      FROM 
        video_collection vc
      LEFT JOIN 
        video_intermediate vi
      ON 
        vc.id = vi.id
      LEFT JOIN
        videos v ON vi.videoid=v.id
      GROUP BY 
        vc.id
      ORDER BY
        vc.name;
    `;

    try {
      let videoCollections = await psql.query(queryText);
      res.json(videoCollections.rows);
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
        video_collection (name, description)
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
        video_collection
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
    let params = [req.params.id];
    let queryText = `
      INSERT INTO 
        video_intermediate (id, videoid)
      VALUES
    `;

    for (let i = 0; i < req.body.videos.length; i++) {
      queryText += `($1, $${i + 2})`;
      if (i !== req.body.videos.length - 1) {
        queryText += `,`;
      }
      params.push(req.body.videos[i]);
    }
    queryText += `RETURNING *`;

    try {
      let added = await psql.query(queryText, params);
      if (added) {
        res.status(200).json(added);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    var params = [req.params.id];
    var queryText = `
      DELETE FROM 
        video_intermediate
      WHERE
        id=$1 AND (
    `;

    var i = 0;
    for (i = 0; i < req.body.videos.length; i++) {
      queryText += `videoid=$${i + 2}`;
      if (i !== req.body.videos.length - 1) {
        queryText += ` OR `;
      } else {
        queryText += `) `;
      }
      params.push(req.body.videos[i]);
    }
    queryText += ` RETURNING *`;

    try {
      let removed = await psql.query(queryText, params);
      if (removed) {
        res.json(removed);
      }
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

module.exports = router;

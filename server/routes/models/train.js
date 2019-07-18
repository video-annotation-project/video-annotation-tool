const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");
const AWS = require("aws-sdk");

/**
 * @route POST /api/models/train
 * @group models 
 * @summary Start a training session
 * @param {integer} modelInstanceId.body.required - ID of model instance to use
 * @param {enum} command.body - "start" or "stop" (Start or stop training)
 * @returns 200 - Succesfully started/stopped training
 * @returns {Error} 500 - Unexpected server error
 */
router.post("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let ec2 = new AWS.EC2({ region: "us-west-1" });

    let params = {
      InstanceIds: [req.body.modelInstanceId]
    };
    if (req.body.command === "stop") {
      const trainingStop = `
            UPDATE 
              training_progress
            SET 
              running = False
            WHERE
              id=(SELECT max(id) FROM training_progress)`;

      const predictStop = `
            UPDATE 
              predict_progress
            SET 
              running = False
            WHERE
              id=(SELECT max(id) FROM predict_progress)`;

      await psql.query(trainingStop);
      await psql.query(predictStop);

      ec2.stopInstances(params, (err, data) => {
        if (err) console.log(err, err.stack);
      });
    } else {
      ec2.startInstances(params, (err, data) => {
        if (err) console.log(err, err.stack);
      });
    }
  }
);

// TODO: figure out trainmodel then document this

router.get("/:option", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `SELECT * FROM modeltab WHERE option = $1`;
    try {
      let response = await psql.query(queryText, [req.params.option]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/models");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.put("/:option", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `UPDATE modeltab SET info = $1 WHERE option = $2`;
    try {
      let response = await psql.query(queryText, [
        req.body.info,
        req.params.option
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on put /api/models");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get("/concepts/:videoIDs/:modelName", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT
        *
      FROM 
        concepts
      WHERE
        concepts.id in (SELECT unnest(concepts) FROM models WHERE name=$1) AND
        concepts.id in (
          SELECT
            DISTINCT conceptid
          FROM
            annotations
          WHERE
            videoid::text = ANY(string_to_array($2, ','))
        )
    `;
    try {
      let response = await psql.query(queryText, [
        req.params.modelName,
        req.params.videoIDs
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log("Error on GET /api/models/train/concepts");
      console.log(error);
      res.status(500).json(error);
    }
  }
);


// Get videos that users have viewed
router.get("/videos/:userIDs/:model", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT DISTINCT 
        v.id, v.filename
      FROM
        checkpoints c
      LEFT JOIN
        videos v ON v.id=c.videoid
      WHERE 
        /* Get videos from only users selected */
        c.userid::text = ANY(string_to_array($1, ','))
      AND 
        /* Exclude verification videos */
        NOT (v.id = ANY(
          SELECT unnest(verificationvideos) FROM models WHERE name=$2)
        )
      AND 
        /* Include only videos that have concepts model is training on */
        v.id IN (
          SELECT
            DISTINCT videoid
          FROM
            annotations
          WHERE
            conceptid = ANY(SELECT unnest(concepts) FROM models WHERE name=$2)
        )
    `;
    try {
      const videos = await psql.query(queryText, [
        req.params.userIDs,
        req.params.model
      ]);
      res.json(videos.rows);
    } catch (error) {
      console.log("Error in get /api/videos/trainModel/");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

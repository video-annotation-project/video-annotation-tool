const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const AWS = require('aws-sdk');

router.patch(
  '/stop',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      UPDATE
        training_progress
      SET
        stop_flag = True,
        status = 2
      RETURNING *
    `;

    try {
      let result = await psql.query(queryText);
      if (result) {
        res.status(200).json(result.rows);
      }a
    } catch (error) {
      res.json(error);
    }
  }
);

router.patch(
  '/reset',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const resetTraining = `
      UPDATE
        training_progress
      SET
        status = 0,
        std_out='',
        std_err=''
    `;

    const resetPredicting = `DELETE FROM predict_progress;`;

    try {
      await psql.query(resetTraining);
      await psql.query(resetPredicting);
    } catch (error) {
      res.json(error);
    }
  }
);

/**
 * @route POST /api/models/train
 * @group models
 * @summary Start a training session
 * @param {integer} modelInstanceId.body.required - ID of model instance to use
 * @param {enum} command.body - "start" or "stop" (Start or stop training)
 * @returns 200 - Succesfully started/stopped training
 * @returns {Error} 500 - Unexpected server error
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let ec2 = new AWS.EC2({ region: 'us-west-1' });

    let params = {
      InstanceIds: [req.body.modelInstanceId]
    };

    if (req.body.command === 'stop') {
      const trainingStop = `
            UPDATE 
              training_progress
            SET 
              status = 0,
              std_out = '',
              std_err = ''`;

      const predictStop = `DELETE FROM predict_progress`;

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

router.put(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {

    let queryText = `
    UPDATE 
      model_params 
    SET
      epochs=$1,
      min_images=$2,
      model=$3,
      annotation_collections=$4,
      verified_only=$5,
      include_tracking=$6 `;

    try {
      console.log(req.body);
      let response = await psql.query(queryText, [
        req.body.epochs,
        req.body.minImages,
        req.body.modelSelected,
        req.body.annotationCollections,
        req.body.verifiedOnly,
        req.body.includeTracking
      ]);
      res.json(response.rows);
    } catch (error) {
      console.log('Error on put /api/models/train');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `SELECT * FROM model_params`;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows[0]);
    } catch (error) {
      console.log('Error on GET /api/models');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// TODO: figure out trainmodel then document this

router.get(
  '/:option',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `SELECT * FROM modeltab WHERE option = $1`;
    try {
      let response = await psql.query(queryText, [req.params.option]);
      res.json(response.rows);
    } catch (error) {
      console.log('Error on GET /api/models');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get(
  '/concepts/:videoIDs/:modelName',
  passport.authenticate('jwt', { session: false }),
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
      console.log('Error on GET /api/models/train/concepts');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// Get videos that users have viewed
router.get(
  '/videos/:userIDs/:model',
  passport.authenticate('jwt', { session: false }),
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
      console.log('Error in get /api/videos/trainModel/');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

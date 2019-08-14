const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

/**
 * @typedef trainProgress
 * @property {boolean} running - Is the model currently training
 * @property {integer} curr_epoch - Current epoch the training is at
 * @property {integer} curr_batch - Current batch the training is at
 * @property {integer} max_epoch - Maximum epoch to end training
 * @property {integer} steps_per_epoch - Number of batches per epoch
 */

/**
 * @route GET /api/models/progress/train
 * @group models
 * @summary Get current training session progress
 * @returns {trainProgress.model} 200 - Current training progress
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/train',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
      SELECT 
        * 
      FROM 
        training_progress 
      LIMIT 1
    `;
    try {
      let response = await psql.query(queryText);
      res.json(response.rows);
    } catch (error) {
      console.log('Error on GET /api/models');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef predictProgress
 * @property {integer} videoid - ID of the video we're predicting
 * @property {integer} framenum - Current frame we are predicting on
 * @property {integer} status - Current prediction step (0 = resizing, 1 = predicting, 2 = generating)
 * @property {integer} totalframe - Total number of frames in video
 */

/**
 * @route GET /api/models/progress/predict
 * @group models
 * @summary Get current video prediction progress
 * @returns {predictProgress.model} 200 - Current prediction progress
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/predict',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const queryText = `
    SELECT 
      *,
      (SELECT verificationvideos
      FROM models 
      WHERE name=(SELECT model FROM model_params WHERE option='train'))
      as totalvideos
    FROM 
      predict_progress 
    LIMIT 1
    `;
    try {
      let response = await psql.query(queryText);
      let returnValue = response.rows[0];
      returnValue.currentVideo =
        returnValue.totalvideos.indexOf(returnValue.videoid) + 1;
      res.json(returnValue);
    } catch (error) {
      console.log('Error on GET /api/models');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

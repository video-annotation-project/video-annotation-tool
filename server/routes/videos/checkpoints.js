const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');

var configData = require('../../../config.json');

router.delete(
  '/:videoid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const userid = req.user.id;
    const videoid = req.params.videoid;
    const queryText = `
      DELETE FROM 
        checkpoints
      WHERE 
        userid=$1 AND videoid=$2
      RETURNING *
     `;
    try {
      await psql.query(queryText, [userid, videoid]);
      res.json({ message: 'unwatched' });
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.put(
  '/:videoid',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const videoid = req.params.videoid;
    const { timeinvideo, finished } = req.body;
    const userId = req.user.id;
    const data = [timeinvideo, finished, userId, videoid];
    let queryText = `
      UPDATE 
        checkpoints
      SET 
        timeinvideo=$1,
        timestamp=current_timestamp,
        finished=$2
      WHERE 
        userid=$3 AND videoid=$4
    `;
    try {
      const updateRes = await psql.query(queryText, data);
      if (updateRes.rowCount > 0) {
        res.json({ message: 'updated' });
        return;
      }
      // User has no checkpoint for this video
      queryText = `
        INSERT INTO 
          checkpoints (timeinvideo, finished, userid, videoid, timestamp)
        VALUES
          ($1, $2, $3, $4, current_timestamp)
       `;
      let insertRes = await psql.query(queryText, data);
      res.sendStatus(200);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;

const router = require('express').Router();
const passport = require("passport");
const psql = require("../../db/simpleConnect");

var data = require('../../../config.json');

router.use('/checkpoints', require('./checkpoints'))
router.use('/aivideos', require('./ai_videos'))



/**
 * @typedef video
 * @property {integer} id - ID of the video
 * @property {string} filename - Filename of the video
 * @property {boolean} finished - Is the video done being annotated
 * @property {timeinvideo} finished - Is the video done being annotated
 * @property {string} timeinvideo - How far in seconds has the video been annotated
 * @property {integer} count - How many annotations does this video have
 */

/**
 * @typedef videoArray
 * @property {Array.<video>} startedVideos - Videos that've been started
 * @property {Array.<video>} unwatchedVideos - Videos that are unwatched
 * @property {Array.<video>} watchedVideos - Videos that've been watched
 * @property {Array.<video>} inProgressVideos - Videos that are in progress
 */

/**
 * @route GET /api/videos
 * @group videos 
 * @summary Get a list of all videos, separated by progress
 * @returns {videoArray.model} 200 - An object containing 4 arrays of videos separated based on progress
 * @returns {Error} 500 - Unexpected database error
 */
router.get("/", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let userId = req.user.id;
    //These need to be updated using joins to become optimal
    let queryUserStartedVideos = `
      SELECT 
        videos.id,
        videos.filename,
        checkpoints.finished,
        checkpoints.timeinvideo,
        count.count
      FROM
        checkpoints
      LEFT JOIN 
        (
          SELECT videoid, count(*) FROM checkpoints GROUP BY videoid
        ) AS count ON count.videoid=checkpoints.videoid
      LEFT JOIN
        videos ON videos.id=checkpoints.videoid
      WHERE
        checkpoints.userid=$1 AND checkpoints.finished=false
      ORDER BY
        videos.id
    `;
    let queryGlobalUnwatched = `
      SELECT 
        videos.id, videos.filename, false as finished, 0 as timeinvideo
      FROM 
        videos
      WHERE 
        id NOT IN (SELECT videoid FROM checkpoints)
      ORDER BY
        videos.id
    `;
    let queryGlobalWatched = `
      SELECT DISTINCT
        videos.id,
        videos.filename,
        checkpoints.finished,
        (
          CASE WHEN c.timeinvideo IS NULL THEN 0 ELSE c.timeinvideo END
        ) AS timeinvideo
      FROM
        checkpoints
      LEFT JOIN
        (
          SELECT videoid, timeinvideo FROM checkpoints WHERE userid=$1
        ) AS c ON c.videoid=checkpoints.videoid
      LEFT JOIN
        videos ON videos.id=checkpoints.videoid
      WHERE
        checkpoints.finished=true
      ORDER BY
        videos.id
    `;

    let queryGlobalInProgress = `
      SELECT 
        DISTINCT ON (videos.id) videos.id,
        videos.filename,
        checkpoints.finished,
        (
          CASE WHEN c.timeinvideo IS NULL THEN 0 ELSE c.timeinvideo END
        ) AS timeinvideo
      FROM
        checkpoints
      LEFT JOIN 
        (
          SELECT videoid, timeinvideo FROM checkpoints WHERE userid=$1
        ) AS c ON c.videoid=checkpoints.videoid
      LEFT JOIN
        videos ON videos.id=checkpoints.videoid
      WHERE 
        videos.id NOT IN (SELECT videoid FROM checkpoints WHERE finished=true)
      ORDER BY
        videos.id
    `;
    try {
      const startedVideos = await psql.query(queryUserStartedVideos, [userId]);
      const unwatchedVideos = await psql.query(queryGlobalUnwatched);
      const watchedVideos = await psql.query(queryGlobalWatched, [userId]);
      const inProgressVideos = await psql.query(queryGlobalInProgress, [
        userId
      ]);

      const videoData = {
        startedVideos: startedVideos.rows,
        unwatchedVideos: unwatchedVideos.rows,
        watchedVideos: watchedVideos.rows,
        inProgressVideos: inProgressVideos.rows
      };

      res.json(videoData);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

// TODO: clean up this return body
// summary getter ~KLS
/**
 * @typedef summary
 * @property {integer} id - ID of the concept
 * @property {string} name - Name of the concept
 * @property {string} rank - Rank of the concept
 * @property {integer} parent - Parent concept
 * @property {string} picture - Concept picture filename
 * @property {integer} conceptid - ID of the concept
 * @property {integer} videoid - ID of the concept
 * @property {string} count - Count of the annotations of the concept in the video
 */
/**
 * @route GET /api/videos/summary/:videoid
 * @group videos 
 * @summary Get a list of concepts in a video
 * @param {integer} videoid.url.required - ID of the video to get the array from
 * @returns {Array.<summary>} 200 - An array of concepts in the video
 * @returns {Error} 500 - Unexpected database error
 */
router.get("/summary/:videoid", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    tracking_users = data.ml.tracking_users;
    let queryText = `
    SELECT 
      *
    FROM 
      concepts a 
    JOIN 
      (
        SELECT 
          conceptid, videoid, COUNT(*) 
        FROM 
          annotations 
        WHERE userid = ANY(${"'{"+tracking_users+"}'"}::int[])
        GROUP BY conceptid, videoid
      ) AS counts ON counts.conceptid=a.id
    WHERE videoid = $1`;
    try {
      const summary = await psql.query(queryText, [req.params.videoid]);
      res.json(summary.rows);
    } catch (error) {
      console.log("Error in get /api/videos/summary/:videoid");
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.patch("/:videoid", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = 'UPDATE videos SET description=$1 WHERE id=$2 RETURNING *';
    try {
      const updateRes = await psql.query(queryText, [
        req.body.description,
        req.params.videoid
      ]);
      res.json(updateRes.rows);
    } catch (error) {
      res.status(500).json(error);
    }
  }
);


router.get("/:videoid", passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    let queryText = `
      SELECT 
        usernames.userswatching, usernames.usersfinished, videos.* 
      FROM 
        (
          SELECT 
            videos.id,
            array_agg(users.username) AS userswatching, 
            array_agg(checkpoints.finished) AS usersfinished 
          FROM 
            videos 
          FULL OUTER JOIN 
            checkpoints ON checkpoints.videoid=videos.id 
          LEFT JOIN 
            users ON users.id=checkpoints.userid 
          WHERE 
            videos.id=$1 
          GROUP BY videos.id
        ) AS usernames  
      LEFT JOIN 
        videos ON videos.id=usernames.id
    `;
    try {
      const videoMetadata = await psql.query(queryText, [req.params.videoid]);
      res.json(videoMetadata.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

module.exports = router;
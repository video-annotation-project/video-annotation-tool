const router = require('express').Router();
const passport = require('passport');
const psql = require('../../db/simpleConnect');
const AWS = require('aws-sdk');

var configData = require('../../../config.json');

/**
 * @typedef annotation
 * @property {integer} id - ID of the annotation
 * @property {string} comment - Annotation comment
 * @property {integer} verifiedby - ID of the user who verified this annotation
 * @property {integer} priority - Training priorty of this annotation
 * @property {boolean} unsure - Was the annotator unsure of the annotation
 * @property {string} timeinvideo - Time in seconds in the video where the annotation takes place
 * @property {string} imagewithbox - Filename of the saved image with the bounding box
 * @property {string} name - Name of the annotation's concept
 * @property {string} extended - Is the annotation extended
 */

/**
 * @route GET /api/annotations
 * @group annotations
 * @summary Get a list of annotations
 * @param {string} unsureOnly.query - Only return annotations marked as unsure
 * @param {enum} verifiedCondition.query - Show verified or unverified annotations only
 * either "verified only" or "unverified only"
 * @param {string} admin.query - Is the user an admin
 * @param {string} queryLimit.query - Limit the number of results returned
 * @returns {Array.<annotation>} 200 - An array of annotations
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let params = [];
    let queryPass = `
      SELECT
        annotations.*, concepts.name, 
        false as extended 
      FROM
        annotations
      LEFT JOIN
        concepts ON annotations.conceptid=concepts.id
      WHERE 
        annotations.userid NOT IN (17, 32)`;
    if (req.query.unsureOnly === 'true') {
      queryPass += ` AND annotations.unsure = true`;
    }
    if (req.query.verifiedCondition === 'verified only') {
      queryPass += ` AND annotations.verifiedby IS NOT NULL`;
    } else if (req.query.verifiedCondition === 'unverified only') {
      queryPass += ` AND annotations.verifiedby IS NULL`;
    }
    if (!req.user.admin) {
      queryPass += ` AND annotations.userid = $1`;
      params.push(req.user.id);
    }
    // Adds query conditions from Report tree
    if (req.query.queryConditions) {
      queryPass +=
        req.query.queryConditions + ` ORDER BY annotations.timeinvideo`;
    }
    // Retrieves only selected 100 if queryLimit exists
    if (
      req.query.queryLimit !== undefined &&
      req.query.queryLimit !== 'undefined'
    ) {
      queryPass = queryPass + req.query.queryLimit;
    }
    try {
      const annotations = await psql.query(queryPass, params);
      res.json(annotations.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

router.get(
  '/boxes/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let params = [
      req.query.videoid,
      req.query.timeinvideo,
      req.params.id,
      req.query.selectedAnnotationCollections
    ];
    let queryText = `
      WITH annotationsAtVideoFrame AS (
        SELECT 
          a.*
        FROM
          annotations a
        LEFT JOIN
          videos v ON v.id = a.videoid
        WHERE 
          a.videoid = $1
          AND ROUND(v.fps * a.timeinvideo) = ROUND(v.fps * $2)
          AND a.id <> $3
      )
      SELECT
        c.verified_flag,
        json_agg(
        json_build_object(
          'id', c.id, 'x1',c.x1, 'y1',c.y1, 'x2',c.x2, 'y2',c.y2,
          'videowidth', c.videowidth, 'videoheight', c.videoheight, 'name', c.name, 'admin', c.admin, 'userid', c.userid )) as box
      FROM
        (SELECT 
          a.id, a.x1, a.x2, a.y1, a.y2, a.videowidth, a.videoheight, cc.name, u.admin, a.userid,
          CASE WHEN
            array_agg(ai.id) && $4 
            AND a.verifiedby IS NOT NULL 
          THEN 1 
            WHEN array_agg(ai.id) && $4
          THEN 2
            WHEN u.admin is null
          THEN 3
          ELSE 0 
          END AS verified_flag
        FROM
          annotationsAtVideoFrame a
        LEFT JOIN concepts cc ON cc.id = a.conceptid
        LEFT JOIN annotation_intermediate ai ON ai.annotationid=a.id
        LEFT JOIN users u on u.id = a.userid
        GROUP BY
            a.id, a.x1, a.x2, a.y1, a.y2, a.videowidth, a.videoheight, a.verifiedby, cc.name, u.admin, a.userid) c
      WHERE c.verified_flag != 2
      GROUP BY c.verified_flag
      ORDER BY c.verified_flag;
    `;
    try {
      let response = await psql.query(queryText, params);
      if (response) {
        res.json(response.rows);
      }
    } catch (error) {
      console.log('Error in GET /api/annotations/verifiedboxes');
      console.log(error);
      res.json(error);
    }
  }
);

router.get(
  '/collections',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      selectedAnnotationCollections,
      excludeTracking,
      selectedTrackingFirst
    } = req.query;

    let params = [selectedAnnotationCollections];
    let queryText = `
      WITH collection AS (
        SELECT
          a.*, c.name, c.picture, u.username, u.admin,
          v.filename, ROUND(a.timeinvideo * v.fps) as frame
        FROM
          annotation_intermediate ai
        LEFT JOIN
          annotations a ON a.id=ai.annotationid
        LEFT JOIN
          concepts c ON c.id=a.conceptid
        LEFT JOIN
          users u ON u.id=a.userid
        LEFT JOIN
          videos v ON v.id=a.videoid
        WHERE
          ai.id::TEXT = ANY($1) AND a.verifiedby IS NULL         
          ${
            excludeTracking === 'true'
              ? `AND a.userid!=${configData.ml.tracking_userid}`
              : ``
          }
        LIMIT 1000)
        SELECT
          *
        FROM 
          collection ac
        WHERE
          ac.verifiedby IS NULL
        UNION
        SELECT
          DISTINCT ON (videoid, frame) *
        FROM
          collection b
        WHERE
          NOT EXISTS (
            SELECT
              1
            FROM
              verified_frames v
            WHERE
              b.videoid=v.videoid
              AND b.frame=v.framenum)
        ORDER BY videoid, timeinvideo, id`;

    if (selectedTrackingFirst === 'true') {
      queryText = `
        SELECT
          a.*, c.name, c.picture, u.username,
          v.filename, ROUND(a.timeinvideo * v.fps) as frame
        FROM
          annotation_intermediate ai
        LEFT JOIN
          annotations a ON a.id=ai.annotationid
        LEFT JOIN
          concepts c ON c.id=a.conceptid
        LEFT JOIN
          users u ON u.id=a.userid
        LEFT JOIN
          videos v ON v.id=a.videoid
        WHERE
          ai.id::TEXT = ANY($1)
          AND a.tracking_flag IS NULL
      `;
    }
    try {
      const annotations = await psql.query(queryText, [params]);
      res.json(annotations.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef annotationInsert
 * @property {string} message - "Annotated"
 * @property {string} value - Inserted row.
 * e.g. "{\"id\":1970,\"videoid\":12,\"userid\":4,\"conceptid\":53,\"timeinvideo\":21.416856,\"x1\":610,
 *\"y1\":296,\"x2\":853,\"y2\":452,\"videowidth\":1600,\"videoheight\":900,\"dateannotated\":\"2019-07-16T08:44:51.505Z\",
 *\"image\":\"1563241431179.png\",\"imagewithbox\":\"1563241431179_box.png\",\"comment\":\"Test comment\",\"unsure\":true,
 *\"originalid\":null,\"aivideo\":null,\"framenum\":null,\"verifiedby\":null,\"verifieddate\":null,\"priority\":0,
 *\"oldconceptid\":null,\"oldx1\":null,\"oldy1\":null,\"oldx2\":null,\"oldy2\":null,\"bad_tracking\":false}"
 */

/**
 * @route POST /api/annotations
 * @group annotations
 * @summary Add an annotation
 * @param {integer} videoId.body.required - Video ID for annotation
 * @param {integer} conceptId.body.required - Concept ID for annotation
 * @param {number} timeinvideo.body.required - Time in video in seconds for annotation
 * @param {integer} x1.body.required - Left of bounding box coordinates
 * @param {integer} x2.body.required - Right of bounding box coordinates
 * @param {integer} y1.body.required - Top of bounding box coordinates
 * @param {integer} y2.body.required - Bottom of bounding box coordinates
 * @param {integer} videoWidth.body.required - Width of video
 * @param {integer} videoHeight.body.required - Height of video
 * @param {string} image.body.required - Filename of image
 * @param {string} imagewithbox.body.required - Filename of image with bounding box
 * @param {string} comment.body.required - Annotation comment
 * @param {boolean} unsure.body.required - Is the annotator sure of the annotation
 * @returns {annotationInsert.model} 200 - Message plus inserted annotation
 * @returns {Error} 500 - Unexpected database error
 */
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    data = [
      req.user.id,
      req.body.videoId,
      req.body.conceptId,
      req.body.timeinvideo,
      req.body.x1,
      req.body.y1,
      req.body.x2,
      req.body.y2,
      req.body.videoWidth,
      req.body.videoHeight,
      req.body.image + '.png',
      req.body.imagewithbox + '.png',
      req.body.comment,
      req.body.unsure
    ];
    const queryText = `
      INSERT INTO 
        annotations (
          userid, videoid, conceptid, timeinvideo, x1, y1, x2, y2, videoWidth,
          videoHeight, image, imagewithbox, comment, unsure, dateannotated
        )
      VALUES
        (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
          current_timestamp
        )
      RETURNING *
     `;
    try {
      let insertRes = await psql.query(queryText, data);
      res.json({
        message: 'Annotated',
        value: JSON.stringify(insertRes.rows[0])
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error });
    }
  }
);

/**
 * @route PATCH /api/annotations
 * @group annotations
 * @summary Update an annotation
 * @param {enum} op.body.required - Either "updateBoundingBox" or "verifyAnnotation"
 * @param {integer} id.body.required - Annotation ID
 * @param {integer} x1.body - New left of bounding box coordinates
 * @param {integer} x2.body - New right of bounding box coordinates
 * @param {integer} y1.body - New top of bounding box coordinates
 * @param {integer} y2.body - New bottom of bounding box coordinates
 * @param {integer} oldx1.body - Old left of bounding box coordinates
 * @param {integer} oldx2.body - Old right of bounding box coordinates
 * @param {integer} oldy1.body - Old top of bounding box coordinates
 * @param {integer} oldy2.body - Old bottom of bounding box coordinates
 * @param {integer} conceptId.body - Old bottom of bounding box coordinates
 * @param {integer} oldConceptID.body - Old bottom of bounding box coordinates
 * @returns {enum} 200 - Either "success" or []
 * @returns {Error} 500 - Unexpected database or S3 error
 */
router.patch(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    if (req.body.op === 'updateBoundingBox') {
      updateBoundingBox(req, res);
    } else if (req.body.op === 'verifyAnnotation') {
      verifyAnnotation(req, res);
    } else {
      res.status(400).json({ error: 'Unrecognized patch operation.' });
    }
  }
);

/**
 * @route DELETE /api/annotations
 * @group annotations
 * @summary Delete an annotation
 * @param {integer} id.body.required - Annotation ID
 * @returns {string} 200 - "delete"
 * @returns {Error} 500 - Unexpected database or S3 error
 */
router.delete(
  '/',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let s3 = new AWS.S3();
    let queryText = `
      DELETE FROM
        annotations
      WHERE 
        annotations.id=$1 OR annotations.originalid=$1 
      RETURNING *
    `;
    try {
      let deleteRes = await psql.query(queryText, [req.body.id]);

      //These are the s3 objects we will be deleting
      let Objects = [];

      // add tracking video
      Objects.push({
        Key:
          process.env.AWS_S3_BUCKET_VIDEOS_FOLDER +
          req.body.id +
          '_tracking.mp4'
      });
      let params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: {
          Objects: Objects
        }
      };
      let s3Res = await s3.deleteObjects(params, (err, data) => {
        if (err) {
          console.log('Err: deleting images');
          res.status(500).json(err);
        } else {
          res.json('delete');
        }
      });
    } catch (error) {
      console.log('Error in delete /api/annotations');
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef imageMessage
 * @property {string} message - "successfully uploaded image to S3"
 */

/**
 * @route POST /api/annotations/images
 * @group annotations
 * @summary Upload an annotation image to the S3 bucket
 * @param {string} name.body - Name of the annotation
 * @param {string} date.body - Date this image was annotated
 * @param {boolean} box.body - Does this image have a bounding box
 * @param {boolean} buf.body.required - Base 64 image source
 * @returns {imageMessage.model} 200 - Success message
 * @returns {Error} 500 - Unexpected S3 error
 */
router.post(
  '/images',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    let s3 = new AWS.S3();
    let key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER;
    key += req.body.date;
    key += '.png';

    const params = {
      Key: key,
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      ContentEncoding: 'base64',
      ContentType: 'image/png',
      Body: Buffer.from(req.body.buf) //the base64 string is now the body
    };
    s3.putObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res
          .status(500)
          .json(error)
          .end();
      } else {
        res.json({ message: 'successfully uploaded image to S3' });
      }
    });
  }
);

/**
 * @typedef trackingInfo
 * @property {integer} id - ID of the changed annotation
 */

/**
 * @route PATCH /api/annotations/tracking/:id
 * @group annotations
 * @summary Mark a tracking annotation as bad
 * @param {string} id.url.required - ID of the tracking annotation
 * @returns {Array.<trackingInfo>} 200 - Changed tracking annotation IDs
 * @returns {Error} 500 - Unexpected database error
 */
router.patch(
  `/tracking/:id`,
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let queryText = `
      UPDATE
        annotations
      SET
        tracking_flag=$1
      WHERE
        id=$2
      RETURNING id
    `;

    try {
      let updated = await psql.query(queryText, [req.body.flag, req.params.id]);
      res.json(updated.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route GET /api/annotations/unverified
 * @group annotations
 * @summary Get unverified annotations
 * @param {Array.<integer>} selectedUsers.query - Get unverified from these user IDs
 * @param {Array.<integer>} selectedVideos.query - Get unverified from these video IDs
 * @param {Array.<integer>} selectedConcepts.query - Get unverified for these concept IDs
 * @param {Array.<integer>} selectedUnsure.query - Get only unverified that are unsure
 * @param {Boolean} verifiedOnly.query - If true get only verified annotations else everything
 * @returns {Array.<object>} 200 - Returns matching rows from database
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/verified',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const verifiedOnly = req.query.verifiedOnly;
    const selectedVideos = req.query.selectedVideos;
    const selectedConcepts = req.query.selectedConcepts;
    const selectedUsers = req.query.selectedUsers;
    const selectedUnsure = req.query.selectedUnsure;

    let params = [];
    let queryText = 'SELECT DISTINCT ';
    let orderBy = '';

    if (selectedUsers && selectedVideos && selectedConcepts) {
      queryText += `a.unsure `;
    } else if (selectedUsers && selectedVideos) {
      queryText += `c.* `;
      orderBy = ' ORDER BY c.name';
    } else if (selectedUsers) {
      queryText += `v.id, v.filename, v.goodvideo `;
      orderBy = ' ORDER BY v.id';
    } else {
      res.status(400).json({ error: 'Nothing selected.' });
    }

    queryText += `
      FROM 
        annotations a
      LEFT JOIN
        concepts c ON c.id=conceptid
      LEFT JOIN
        users u ON u.id=userid
      LEFT JOIN
        videos v ON v.id=videoid
      WHERE TRUE
    `;

    if (verifiedOnly === '-1') {
      //queryText += ` AND a.verifiedby IS NULL`;
    }

    if (selectedUsers) {
      queryText += ` AND a.userid::text=ANY($${params.length + 1})`;
      params.push(selectedUsers);
    }

    if (selectedVideos) {
      queryText += ` AND a.videoid::text=ANY($${params.length + 1})`;
      params.push(selectedVideos);
    }

    if (selectedConcepts) {
      queryText += ` AND a.conceptid::text=ANY($${params.length + 1})`;
      params.push(selectedConcepts);
    }

    if (selectedUnsure === 'true') {
      queryText += ` AND unsure`;
    }
    queryText += orderBy;
    try {
      let concepts = await psql.query(queryText, params);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

/**
 * @route GET /api/annotations/unverified
 * @group annotations
 * @summary Get unverified annotations
 * @param {Array.<integer>} selectedUsers.query - Get unverified from these user IDs
 * @param {Array.<integer>} selectedVideos.query - Get unverified from these video IDs
 * @param {Array.<integer>} selectedConcepts.query - Get unverified for these concept IDs
 * @param {Array.<integer>} selectedUnsure.query - Get only unverified that are unsure
 * @param {Boolean} selectedTrackingFirst.query - If true get only tracking_flag is null else unverified
 * @returns {Array.<object>} 200 - Returns matching rows from database
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/unverified',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    const {
      selectedUsers,
      selectedVideos,
      selectedConcepts,
      selectedUnsure,
      selectedTrackingFirst,
      excludeTracking
    } = req.query;
    const params = [selectedUsers, selectedVideos, selectedConcepts];

    let queryText = `
      WITH verifyAnnotations AS (
        SELECT 
          a.*, c.name, c.picture, u.username,
          v.filename, ROUND(a.timeinvideo*v.fps) frame 
        FROM 
          annotations a
        LEFT JOIN
          concepts c ON c.id=conceptid
        LEFT JOIN
          users u ON u.id=userid
        LEFT JOIN
          videos v ON v.id=videoid
        WHERE
          a.userid::text=ANY($1)
          AND a.videoid::text=ANY($2)
          AND a.conceptid::text=ANY($3)
          ${selectedUnsure === 'true' ? `AND unsure` : ``}
          ${
            excludeTracking === 'true'
              ? `AND userid!=${configData.ml.tracking_userid}`
              : ``
          }
      )
      SELECT
        *
      FROM
        verifyAnnotations a
      WHERE
        a.verifiedby is NULL
      UNION
      SELECT
          DISTINCT ON (videoid, frame) *
      FROM
          verifyAnnotations b
      WHERE
          NOT EXISTS (
            SELECT
              1 
            FROM
              verified_frames v
            WHERE
              b.videoid=v.videoid 
              AND b.frame=v.framenum
          )
      ORDER BY videoid, frame;`;
    console.log('here');

    if (selectedTrackingFirst === 'true') {
      queryText = `
        SELECT 
          a.*, c.name, c.picture, u.username,
          v.filename, ROUND(a.timeinvideo*v.fps) frame 
        FROM 
          annotations a
        LEFT JOIN
          concepts c ON c.id=conceptid
        LEFT JOIN
          users u ON u.id=userid
        LEFT JOIN
          videos v ON v.id=videoid
        WHERE
          a.userid::text=ANY($1)
          AND a.videoid::text=ANY($2)
          AND a.conceptid::text=ANY($3)
          AND a.tracking_flag is NULL
      `;
    }
    try {
      console.log(queryText);
      const response = await psql.query(queryText, params);
      res.json(response.rows);
    } catch (error) {
      console.log('Error in annotations/unverified' + error);
      res.status(500).json(error);
    }
  }
);

/**
 * @typedef treeData
 * @property {string} name - Name of the specific item in the current level
 * @property {integer} key - ID of the specific item in the current level
 * @property {integer} count - Count of the specific item in the current level
 * @property {boolean} expanded - Always "false", used by react to control expansion
 */

/**
 * @route GET /api/annotations/treeData
 * @group annotations
 * @summary Get tree representation of annotations
 * @param {enum} levelName.query.required - Either "User", "Video", or "Concept"
 * @param {string} queryConditions.query - Conditions for the annotations query
 * @param {boolean} unsureOnly.query - Get annotations that are marked as unsure
 * @param {enum} verifiedCondition.query - "All", "Unverified Only", or "Verified Only"
 * @returns {Array.<treeData>} 200 - Returns matching annotations
 * @returns {Error} 500 - Unexpected database error
 */
router.get(
  '/treeData',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    let params = [];
    let queryPass = selectLevelQuery(req.query.levelName);

    if (req.query.queryConditions) {
      queryPass = queryPass + req.query.queryConditions;
    }
    if (req.query.unsureOnly === 'true') {
      queryPass = queryPass + ` AND annotations.unsure = true`;
    }
    if (req.query.verifiedCondition === 'verified only') {
      queryPass = queryPass + ` AND annotations.verifiedby IS NOT NULL`;
    } else if (req.query.verifiedCondition === 'unverified only') {
      queryPass = queryPass + ` AND annotations.verifiedby IS NULL`;
    }
    if (!req.user.admin) {
      queryPass = queryPass + ` AND annotations.userid = $1`;
      params.push(req.user.id);
    }
    queryPass = queryPass + ` GROUP BY (name, key) ORDER BY count DESC`;

    try {
      const data = await psql.query(queryPass, params);
      res.json(data.rows);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

let updateBoundingBox = async (req, res) => {
  delete req.body.op;

  const params = Object.values(req.body);
  const queryText = `
      UPDATE
        annotations 
      SET 
        x1=$1, y1=$2, x2=$3, y2=$4, oldx1=$5, oldy1=$6, oldx2=$7, oldy2=$8,
        priority = CASE WHEN $10::boolean=true THEN priority+2 ELSE priority+1 END
      WHERE 
        id=$9
    `;
  try {
    let update = await psql.query(queryText, params);
    res.json(update.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

let deleteTrackingAnnotations = req => {
  const id = req.body.id;
  let s3 = new AWS.S3();
  const queryText2 = `
    DELETE FROM
      annotations
    WHERE 
      originalid=$1 AND annotations.id<>$1
    RETURNING *
  `;
  psql.query(queryText2, [id], (err, res) => {
    if (err) {
      console.log(error);
      res.status(500).json(error);
    }
    //These are the s3 object we will be deleting
    let Objects = [];

    // add tracking video
    Objects.push({
      Key:
        process.env.AWS_S3_BUCKET_VIDEOS_FOLDER + req.body.id + '_tracking.mp4'
    });
    params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Delete: {
        Objects: Objects
      }
    };
    s3.deleteObjects(params, (err, data) => {
      if (err) {
        console.log(err);
      }
    });
  });
};

let verifyAnnotation = async (req, res) => {
  delete req.body.op;

  const verifiedby = req.user.id;
  const { id, model } = req.body;
  
  let params = [model, id, verifiedby];
  let queryText1 = `
    UPDATE 
      annotations
    SET 
      verifiedby=$3, verifieddate=current_timestamp, originalid=null`;

  if (req.body.conceptId !== null) {
    queryText1 += `, conceptid=$4, oldconceptid=$5, priority=CASE WHEN $1::boolean=true THEN priority+4 ELSE priority+3 END`;
    params.push(req.body.conceptId);
    params.push(req.body.oldConceptId);
  } else {
    queryText1 += `, priority=priority+1`;
  }

  params.push(req.body.comment);
  queryText1 += `, comment=$` + params.length;
  params.push(req.body.unsure);
  queryText1 += `, unsure=$` + params.length;
  queryText1 += ` WHERE id=$2`;

  try {
    await psql.query(queryText1, params);
    deleteTrackingAnnotations(req);
    res.json('success');
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
};

let selectLevelQuery = level => {
  let queryPass = '';
  if (level === 'Video') {
    queryPass = `
      SELECT 
        videos.filename as name, videos.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, videos
      WHERE 
        videos.id=annotations.videoid AND annotations.userid NOT IN (17, 32)
    `;
  }
  if (level === 'Concept') {
    queryPass = `
      SELECT 
        concepts.name as name, concepts.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, concepts
      WHERE 
        annotations.conceptid=concepts.id AND annotations.userid NOT IN (17, 32)
    `;
  }
  if (level === 'User') {
    queryPass = `
      SELECT 
        users.username as name, users.id as key, COUNT(*) as count,
        false as expanded
      FROM 
        annotations, users
      WHERE
        annotations.userid=users.id AND annotations.userid NOT IN (17, 32)
    `;
  }
  return queryPass;
};

router.post(
  '/verifyframe',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      let result = await psql.query(
        `INSERT INTO verified_frames 
        (videoid, framenum) VALUES
        ($1, ROUND($2))
      `,
        [req.body.videoid, req.body.framenum]
      );
      if (result) {
        res.json('Inserted');
      }
    } catch (error) {
      console.log('ERROR in /api/annotations/verifyframe');
      console.log(error);
      res.json('error');
    }
  }
);

module.exports = router;

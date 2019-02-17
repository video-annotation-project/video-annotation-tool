const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const request = require('request')

const _ = require('lodash');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const passportJWT = require('passport-jwt');
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const bcrypt = require('bcrypt');
const psql = require('./db/simpleConnect');
const AWS = require('aws-sdk');

var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
jwtOptions.secretOrKey = process.env.JWT_KEY;

async function findUser(userId) {
  queryPass = 'select id, username, password, admin \
               from users where users.id=$1';
  const user = await psql.query(queryPass,[userId]);
  if (user.rows.length == 1) {
    return user.rows[0];
  } else {
    return false;
  }
}

var strategy = new JwtStrategy(jwtOptions, async function(jwt_payload, next) {
  console.log('payload received', jwt_payload);

  var user = await findUser(jwt_payload.id);
  if (user) {
    next(null, user);
  } else {
    next(null, false);
  }
});

passport.use(strategy);

const app = express();

app.use(passport.initialize());

// parse application/x-www-form-urlencoded
// for easier testing with Postman or plain HTML forms
// parse application/json - needs higher limit for passing img for annotation

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.post("/api/login", async function(req, res) {
  const {username, password} = req.body;
  let queryPass = 'select id, password, admin \
                   from users where users.username=$1';
  try {
    const user = await psql.query(queryPass,[username]);
    if (user.rowCount === 0) {
      res.status(400).json({detail: "No username found"});
      return;
    }
    if (!await bcrypt.compare(password,user.rows[0].password)) {
      res.status(400).json({detail: "wrong password"});
      return;
    }
    const payload = {id: user.rows[0].id};
    const token = jwt.sign(payload, jwtOptions.secretOrKey);
    res.json({token: token, admin: user.rows[0].admin});
  } catch (error) {
    res.status(500).json(error);
  }
});

app.post('/api/changePassword', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  const {password, newPassword1, newPassword2} = req.body;
  const username = req.user.username;
  const queryPass = 'select password from users where users.username=$1';
  try {
    const currentPass = await psql.query(queryPass,[username]);
    if (!await bcrypt.compare(password, currentPass.rows[0].password)) {
      res.status(400).json({detail: "Wrong Password!"});
      return;
    }
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword1, saltRounds);
    queryUpdate = 'UPDATE users SET password=$1 WHERE username=$2';
    const update = await psql.query(queryUpdate,[hash,username]);
    res.json({message: 'Changed'});
  } catch (error) {
    res.status(500).json(error);
  }
})

app.post('/api/createUser', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    const queryText = "INSERT INTO users(username, password, admin) \
                       VALUES($1, $2, $3) RETURNING *";
    const saltRounds = 10;
    try {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const data = [req.body.username, hash, req.body.admin];
      const insertUser = await psql.query(queryText, data);
      res.json({message: "user created", user: insertUser.rows[0]});
    } catch (error) {
      res.status(400).json(error);
    }
});

app.get('/api/concepts/:id', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'select id, name from concepts where concepts.parent=$1';
    try {
      const concepts = await psql.query(queryText, [req.params.id]);
      res.json(concepts.rows);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

// returns list of concepts based off search criteria in req.query
// currently just looks for exact concept name match.
app.get('/api/concepts', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let concepts = null
    const queryText = "Select id, name, similarity($1,name) \
                       from concepts \
                       where similarity($1, name) > .01 \
                       order by similarity desc limit 10";
    try {
      concepts = await psql.query(queryText, [req.query.name]);
      res.json(concepts.rows);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

// in the future, this route as well as the /api/annotationImages route can
// be circumvented by using cloudfront
app.get('/api/conceptImages/:id',
  async (req, res) => {
    let s3 = new AWS.S3();
    queryText = 'select picture from concepts where concepts.id=$1';
    try {
      const response = await psql.query(queryText, [req.params.id]);
      const picture = response.rows[0].picture;
      const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: process.env.AWS_S3_BUCKET_CONCEPTS_FOLDER + `${picture}`
      }
      s3.getObject(params).createReadStream().pipe(res);
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

app.get('/api/conceptsSelected', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'select * \
                 from profile, concepts \
                 where profile.userid=$1 \
                 AND concepts.id=profile.conceptId \
                 ORDER BY profile.conceptidx, concepts.name';
    try {
      let concepts = await psql.query(queryText, [req.user.id]);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.post('/api/conceptsSelected', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'INSERT INTO profile(userid, conceptid) \
                 VALUES($1, $2) RETURNING *';
    try {
      let insert = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({value: JSON.stringify(insert.rows)});
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

app.delete('/api/conceptsSelected', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let queryText = 'DELETE FROM profile \
                     WHERE profile.userid=$1 AND \
                     profile.conceptid=$2 RETURNING *';
    try {
      let del = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({value: JSON.stringify(del.rows)});
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

// updates conceptsSelected when they are reordered
app.patch('/api/conceptsSelected', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    const conceptsSelected = JSON.stringify(req.body.conceptsSelected);
    const queryText = `UPDATE profile AS p \
                       SET conceptidx=c.conceptidx \
                       FROM json_populate_recordset(null::profile, \
                       '${conceptsSelected}') AS c \
                       WHERE c.userid=p.userid AND \
                       c.conceptid=p.conceptid`;
    try {
      let update = await psql.query(queryText);
      res.json({value: JSON.stringify(update.rows)});
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

app.get('/api/videos', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let userId = req.user.id;
    let queryUserStartedVideos = 'SELECT videos.id, videos.filename, \
                                  checkpoints.finished, checkpoints.timeinvideo \
                                  FROM videos, checkpoints \
                                  WHERE checkpoints.userid=$1 \
                                  AND videos.id=checkpoints.videoid \
                                  AND checkpoints.finished=false \
                                  ORDER BY videos.id';
    let queryGlobalUnwatched = 'SELECT videos.id, videos.filename, \
                                false as finished, 0 as timeinvideo \
                                FROM videos \
                                WHERE id NOT IN (SELECT videoid FROM checkpoints) \
                                ORDER BY videos.id';
    let queryGlobalWatched = 'SELECT DISTINCT videos.id, videos.filename, \
                              checkpoints.finished, 0 as timeinvideo \
                              FROM videos, checkpoints \
                              WHERE videos.id=checkpoints.videoid \
                              AND checkpoints.finished=true \
                              ORDER BY videos.id';
    let queryInProgress = 'SELECT DISTINCT ON (videos.id) videos.id, \
                           videos.filename, false as finished, \
                           checkpoints.timeinvideo \
                           FROM videos, checkpoints \
                           WHERE videos.id=checkpoints.videoid \
                           AND checkpoints.finished=false \
                           AND videos.id NOT IN (SELECT videoid \
                           FROM checkpoints \
                           WHERE finished=true) \
                           ORDER BY videos.id'

    try {
      const startedVideos = await psql.query(queryUserStartedVideos, [userId]);
      const unwatchedVideos = await psql.query(queryGlobalUnwatched);
      const watchedVideos = await psql.query(queryGlobalWatched);
      const inProgressVideos = await psql.query(queryInProgress);
      const videoData = [
        startedVideos,
        unwatchedVideos,
        watchedVideos,
        inProgressVideos];
      res.json(videoData);
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  }
);

app.put("/api/checkpoints", passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  const { videoId, timeinvideo, finished } = req.body;
  const userId = req.user.id;
  const data = [timeinvideo, finished, userId, videoId];
  queryText = 'UPDATE checkpoints \
               SET timeinvideo=$1, timestamp=current_timestamp, finished=$2 \
               WHERE userid=$3 AND videoid=$4';
  try {
    const updateRes = await psql.query(queryText, data);
    if (updateRes.rowCount > 0) {
      res.json({message: "updated"});
      return;
    }
    // User has no checkpoint for this video
    queryText = 'INSERT INTO checkpoints \
                 (timeinvideo, finished, userid, videoid, timestamp) \
                 VALUES($1, $2, $3, $4, current_timestamp)';
    let insertRes = await psql.query(queryText, data);
    res.json({message: "updated"});
  } catch(error) {
    console.log(error);
    res.status(500).json(error);
  }
});

// app.get('/api/videos/Y7Ek6tndnA/:name', (req, res) => {
//   var s3 = new AWS.S3();
//   const mimetype = 'video/mp4';
//   const file = process.env.AWS_S3_BUCKET_VIDEOS_FOLDER + req.params.name;
//   const cache = 0;
//   s3.listObjectsV2({Bucket: process.env.AWS_S3_BUCKET_NAME, MaxKeys: 1, Prefix: file}, function(err, data) {
//     if (err) {
//       return res.sendStatus(404);
//     }
//     if (!data.Contents[0]){
//       return res.redirect('/api/videos/Y7Ek6tndnA/error.mp4');
//     }
//     if (req != null && req.headers.range != null) {
//       var range = req.headers.range;
//       var bytes = range.replace(/bytes=/, '').split('-');
//       var start = parseInt(bytes[0], 10);
//       var total = data.Contents[0].Size;
//       var end = bytes[1] ? parseInt(bytes[1], 10) : total - 1;
//       var chunksize = (end - start) + 1;
//
//       res.writeHead(206, {
//         'Content-Range'  : 'bytes ' + start + '-' + end + '/' + total,
//         'Accept-Ranges'  : 'bytes',
//         'Content-Length' : chunksize,
//         'Last-Modified'  : data.Contents[0].LastModified,
//         'Content-Type'   : mimetype
//       });
//       s3.getObject({Bucket: process.env.AWS_S3_BUCKET_NAME, Key: file, Range: range}).createReadStream().pipe(res);
//     }
//     else
//     {
//       res.writeHead(200,
//       {
//         'Cache-Control' : 'max-age=' + cache + ', private',
//         'Content-Length': data.Contents[0].Size,
//         'Last-Modified' : data.Contents[0].LastModified,
//         'Content-Type'  : mimetype
//       });
//       s3.getObject({Bucket: process.env.AWS_S3_BUCKET_NAME, Key: file}).createReadStream().pipe(res);
//     }
//   });
// });

app.get('/api/annotations', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let params = [];
    //Build query string
    let queryPass = 'SELECT annotations.id, annotations.comment,\
                     annotations.unsure, annotations.timeinvideo, \
                     annotations.imagewithbox, concepts.name, \
                     false as extended \
                     FROM annotations, concepts\
                     WHERE annotations.conceptid=concepts.id'
    if (req.query.unsureOnly === 'true') {
      queryPass = queryPass + ' AND annotations.unsure = true';
    }
    if (req.query.admin !== 'true') {
      queryPass = queryPass + ' AND annotations.userid = $1';
      params.push(req.user.id);
    }
    // Adds query conditions from report tree
    queryPass = queryPass +
                req.query.queryConditions +
                ' ORDER BY annotations.timeinvideo';
    // Retrieves only selected 100 if queryLimit exists
    if (req.query.queryLimit !== 'undefined') {
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

app.post('/api/annotations', passport.authenticate('jwt', {session: false}),
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
    req.body.image+'.png',
    req.body.imagewithbox+'.png',
    req.body.comment,
    req.body.unsure
  ];
  queryText = 'INSERT INTO annotations(userid, videoid,\
               conceptid, timeinvideo, \
               x1, y1, x2, y2, \
               videoWidth, videoHeight, \
               image, imagewithbox, \
               comment, unsure, dateannotated) \
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,\
               $11, $12, $13, $14, current_timestamp) RETURNING *';
  try {
    let insertRes = await psql.query(queryText,data);
    res.json({message: "Annotated", value: JSON.stringify(insertRes.rows[0])});
  } catch(error) {
    console.log(error)
    res.status(400).json(error);
  }
});

app.patch('/api/annotations', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'UPDATE annotations \
                 SET conceptid = $1, comment = $2, unsure = $3 \
                 WHERE annotations.id=$4 OR annotations.originalid=$4 RETURNING *';
    queryUpdate = 'SELECT annotations.id, annotations.comment,\
                   annotations.unsure, annotations.timeinvideo, \
                   annotations.videoWidth, annotations.videoHeight, \
                   annotations.imagewithbox, concepts.name \
                   FROM annotations, concepts \
                   WHERE annotations.id = $1 \
                   AND annotations.conceptid=concepts.id';
    try {
      var editRes = await psql.query(
                            queryText,
                            [req.body.conceptId,
                            req.body.comment,
                            req.body.unsure,
                            req.body.id]
                          );
      var updatedRow = await psql.query(
        queryUpdate,
        [req.body.id]
      );
      res.json(updatedRow.rows[0]);
    } catch (error) {
      console.log(error);
      res.json(error);
    }
  }
);

app.delete('/api/annotations', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'DELETE FROM annotations \
                 WHERE annotations.id=$1 OR \
                 annotations.originalid=$1 RETURNING *';
    try {
      var deleteRes = await psql.query(queryText, [req.body.id]);
      res.json(deleteRes.rows);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

// in the future, this route as well as the /api/conceptImages route can
// be circumvented by using cloudfront
app.get('/api/annotationImages/:name', passport.authenticate('jwt', {session: false}),
  (req, res) => {

  let s3 = new AWS.S3();
  let key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.params.name;
  var params = {
    Key: key,
    Bucket: process.env.AWS_S3_BUCKET_NAME,
  };
  s3.getObject(params, (err, data) => {
    if (err) {
      res.status(500).json(err);
      return;
    }
    res.json({image: data.Body});
  });
});

app.post('/api/annotationImages', passport.authenticate('jwt', {session: false}),
  (req, res) => {

  let s3 = new AWS.S3();
  var key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.body.date;
  if (req.body.box) {
    key += '_box';
  }
  var params = {
    Key: key+'.png',
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    ContentEncoding: 'base64',
    ContentType: 'image/png',
    Body: Buffer(req.body.buf) //the base64 string is now the body
  };
  s3.putObject(params, (err, data) => {
    if (err) {
      console.log(err)
      res.status(400).json(error);
    } else {
      res.json({message: "successfully uploaded image to S3"});
    }
  });
});

let selectLevelQuery = (level) => {
  let queryPass = '';
  if (level === "Video") {
    queryPass = 'SELECT videos.filename as name,\
                 videos.id as key,\
                 COUNT(*) as count, \
                 false as expanded\
                 FROM annotations, videos \
                 WHERE videos.id=annotations.videoid \
                 AND annotations.userid!=17';
  }
  if (level === "Concept") {
    queryPass = 'SELECT concepts.name as name,\
                 concepts.id as key,\
                 COUNT(*) as count,\
                 false as expanded\
                 FROM annotations, concepts \
                 WHERE annotations.conceptid=concepts.id \
                 AND annotations.userid!=17';
  }
  if (level === "User") {
    queryPass = 'SELECT users.username as name,\
                 users.id as key,\
                 COUNT(*) as count, \
                 false as expanded \
                 FROM annotations, users \
                 WHERE annotations.userid=users.id \
                 AND annotations.userid!=17';
  }
  return queryPass;
}

app.get('/api/reportTreeData', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  let params = [];
  let queryPass = selectLevelQuery(req.query.levelName);
  if (req.query.queryConditions) {
    queryPass = queryPass + req.query.queryConditions;
  }
  if (req.query.unsureOnly === 'true') {
    queryPass = queryPass + ' AND annotations.unsure = true';
  }
  if (req.query.admin !== 'true') {
    queryPass = queryPass + ' AND annotations.userid = $1';
    params.push(req.user.id);
  }
  queryPass = queryPass + ' GROUP BY (name, key) ORDER BY count DESC'
  try {
    const data = await psql.query(queryPass, params);
    res.json(data.rows);
  } catch(error) {
    console.log(error);
    res.status(400).json(error);
  }
})

// Express only serves static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));
  app.get('/*', (req, res) =>  {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
}

app.set('port', (process.env.PORT || 3001));

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});

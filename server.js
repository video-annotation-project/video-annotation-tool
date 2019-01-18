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
  queryPass = 'select id, username, password, admin from users where users.id=$1';
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
  let queryPass = 'select id, password, admin from users where users.username=$1';
  try {
    const user = await psql.query(queryPass,[username]);
    if (user.rowCount === 0) {
      res.status(400).json({detail: "No username found"})
    }
    if (!await bcrypt.compare(password,user.rows[0].password)) {
      res.status(400).json({detail: "wrong password"});
    }
    const payload = {id: user.rows[0].id};
    const token = jwt.sign(payload, jwtOptions.secretOrKey);
    res.json({token: token, admin: user.rows[0].admin});
  } catch (error) {
    res.status(400).json(error);
  }
});

//Code for profile modification
app.post('/api/changePassword', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  const {password, newPassword1, newPassword2} = req.body;
  const username = req.user.username;
  const queryPass = 'select password from users where users.username=$1';
  try {
    const currentPass = await psql.query(queryPass,[username]);
    if (!await bcrypt.compare(password, currentPass.rows[0].password)) {
      res.status(400).json({detail: "Wrong Password!"});
    }
    const saltRounds = 10;
    const hash = await bcrypt.hash(newPassword1, saltRounds);
    queryUpdate = 'UPDATE users SET password=$1 WHERE username=$2';
    const update = await psql.query(queryUpdate,[hash,username]);
    res.json({message: 'Changed'});
  } catch (error) {
    res.status(400).json(error);
  }
})

//Code for create users
app.post('/api/createUser', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    const queryText = "INSERT INTO users(username, password, admin) VALUES($1, $2, $3) RETURNING *";
    const saltRounds = 10;
    try {
      const hash = await bcrypt.hash(req.body.password, saltRounds);
      const data = [req.body.username, hash, req.body.admin];
      const insertUser = await psql.query(queryText, data);
      console.log(insertUser);
      res.json({message: "user created", user: insertUser.rows[0]});
    } catch (error) {
      res.status(400).json(error);
    }
});

app.get('/api/concepts', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'select id, name from concepts where concepts.parent=$1';
    try {
      const concepts = await psql.query(queryText, [req.query.id]);
      res.json(concepts.rows);

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
                 ORDER BY concepts.name';
    try {
      let concepts = await psql.query(queryText, [req.user.id]);
      res.json(concepts.rows);
    } catch (error) {
      console.log(error);
      res.json(error);
    }
  }
);

app.post('/api/updateConceptsSelected', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let queryText = 'DELETE FROM profile WHERE profile.userid=$1 AND profile.conceptid=$2 RETURNING *';
    if (req.body.checked) {
      queryText = 'INSERT INTO profile(userid, conceptid) VALUES($1, $2) RETURNING *';
    }
    try {
      let insert = await psql.query(queryText, [req.user.id, req.body.id]);
      res.json({value: JSON.stringify(insert.rows)});
    } catch (error) {
      res.status(400).json(error);
    }
  }
);

//Will get list of concepts based off search criteria to and returns a list of concept id's.
//Currently just looks for exact concept name match.
app.post('/api/searchConcepts', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let concepts = null
    queryText = "Select id, name, similarity($1,name) from concepts where similarity($1, name) > .01 order by similarity desc limit 10";
    try {
      concepts = await psql.query(queryText, [req.body.name]);
    } catch (error) {
      res.status(400).json(error);
    }
    res.json(concepts.rows);
  }
);

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

app.get('/api/videoNames', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryPass = 'select id, filename from videos;'
    try {
      const videoData = await psql.query(queryPass);
      res.json(videoData);
    } catch (error) {
      res.json(error);
    }
  }
);

app.get('/api/userInfo', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let userId = req.user.id;
    queryPass = 'SELECT * FROM users WHERE id=$1;'
    try {
      const videoData = await psql.query(queryPass, [userId]);
      res.json(videoData);
    } catch (error) {
      res.json(error);
    }
  }
);

app.get('/api/userCurrentVideos', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryPass = 'SELECT id, filename \
                 FROM videos \
                 WHERE id IN (SELECT videoid FROM checkpoints WHERE userid=$1 AND finished=false);'
    try {
      const videoData = await psql.query(queryPass, [req.user.id]);
      res.json(videoData);
    } catch (error) {
      res.json(error);
    }
  }
);

// this function needs to be improved
app.post("/api/updateCheckpoint", passport.authenticate('jwt', {session: false}),
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
    res.json(error);
  }

});

app.get('/api/listVideos/', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let userId = req.user.id;
    queryUserStartedVideos = 'SELECT videos.id, videos.filename, checkpoints.finished, checkpoints.timeinvideo \
                              FROM videos, checkpoints \
                              WHERE checkpoints.userid=$1 \
                              AND videos.id=checkpoints.videoid \
                              AND checkpoints.finished=false \
                              ORDER BY videos.id;'
    queryGlobalUnwatched = 'SELECT videos.id, videos.filename, false as finished, 0 as timeinvideo \
                            FROM videos \
                            WHERE id NOT IN (SELECT videoid FROM checkpoints) \
                            ORDER BY videos.id;'
    queryGlobalWatched = 'SELECT DISTINCT videos.id, videos.filename, checkpoints.finished, 0 as timeinvideo \
                          FROM videos, checkpoints \
                          WHERE videos.id=checkpoints.videoid \
                          AND checkpoints.finished=true \
                          ORDER BY videos.id;'
    try {
      const startedVideos = await psql.query(queryUserStartedVideos, [userId]);
      const unwatchedVideos = await psql.query(queryGlobalUnwatched);
      const watchedVideos = await psql.query(queryGlobalWatched);
      const videoData = [startedVideos, unwatchedVideos, watchedVideos];
      res.json(videoData);
    } catch (error) {
      console.log(error);
      res.json(error);
    }
  }
);

app.get('/api/latestWatchedVideo', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let userId = req.user.id;
    queryPass = 'SELECT checkpoints.timeinvideo, videos.filename, videos.id \
                 FROM checkpoints, videos \
                 WHERE checkpoints.userid=$1 AND \
                 checkpoints.videoid=videos.id AND \
                 checkpoints.finished=false \
                 ORDER BY timestamp DESC;'
    try {
      const videoData = await psql.query(queryPass, [userId]);
      res.json(videoData.rows);
    } catch (error) {
      res.json(error);
    }
  }
);

let selectLevels = (levels, selectedIds) => {
  let queryPass = '';
  let level = levels[0];
  if (level === "Video") {
    queryPass = 'SELECT DISTINCT ON (videos.filename) videos.filename as name, videos.id FROM annotations, ';
  }
  if (level === "Concept") {
    queryPass = 'SELECT DISTINCT ON (concepts.name) concepts.name, concepts.id FROM annotations, ';
  }
  if (level === "User") {
    queryPass = 'SELECT DISTINCT ON (users.username) users.username as name, users.id FROM annotations, ';
  }
  queryPass = queryPass + levels.join("s, ") + 's WHERE annotations.' + level.toLowerCase() + 'id=' + level.toLowerCase() + 's.id';
  let levelsSelected = levels.slice(1);
  levelsSelected.forEach((level, index) => {
    queryPass = addCondition(queryPass, level, selectedIds[index]);
  })
  return queryPass;
}

let addCondition = (queryPass, level, id) => {
  let condition = '';
  if ( level !== null) {
    condition = ' AND ' + level.toLowerCase() + 's.id=' + id;
    condition = condition + ' AND ' + level.toLowerCase() + 's.id=annotations.' + level.toLowerCase() + 'id';
  }
  return queryPass + condition;
}

let checkAdminAnnotation = (adminStatus, userId, queryPass, params) => {
  if (adminStatus !== 'true') {
    queryPass = queryPass + ' AND annotations.userid = $1';
    params.push(userId);
  }
  return [queryPass, params];
}

let checkUnsureAnnotation = (unsureStatus, queryPass) => {
  if (unsureStatus === 'true') {
    queryPass = queryPass + ' AND annotations.unsure = true';
  }
  return queryPass;
}

app.get('/api/reportInfoLevel1', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let queryPass = '';
    let level1 = req.query.level1;
    queryPass = selectLevels([level1], []);

    let userId = req.user.id;
    let params = [];
    [queryPass, params] = checkAdminAnnotation(req.query.admin, userId, queryPass, params);
    queryPass = checkUnsureAnnotation(req.query.unsureOnly, queryPass);

    try {
      const reportData = await psql.query(queryPass, params);
      res.json(reportData.rows);
    } catch (error) {
      res.json(error);
    }
  }
);

app.get('/api/reportInfoLevel2', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let queryPass = '';
    let level1 = req.query.level1;
    let level2 = req.query.level2;
    queryPass = selectLevels([level2, level1], [req.query.id]);

    let userId = req.user.id;
    let params = [];

    [queryPass, params] = checkAdminAnnotation(req.query.admin, userId, queryPass, params);
    queryPass = checkUnsureAnnotation(req.query.unsureOnly, queryPass);
    try {
      const reportData = await psql.query(queryPass, params);
      res.json(reportData.rows);
    } catch (error) {
      res.json(error);
    }
  }
);

app.get('/api/reportInfoLevel3', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let queryPass = '';
    let level1 = req.query.level1;
    let level2 = req.query.level2;
    let level3 = req.query.level3;
    let level1Id = req.query.level1Id;
    let id = req.query.id;
    queryPass = selectLevels([level3, level2, level1], [id, level1Id]);

    let userId = req.user.id;
    let params = [];
    [queryPass, params] = checkAdminAnnotation(req.query.admin, userId, queryPass, params);
    queryPass = checkUnsureAnnotation(req.query.unsureOnly, queryPass);
    try {
      const reportData = await psql.query(queryPass, params);
      res.json(reportData.rows);
    } catch (error) {
      res.json(error);
    }
  }
);

let addLevelAnnotations = (queryPass, level) => {
  if ( level !== 'Concept' & level !== null) {
    queryPass = queryPass + ', ' + level.toLowerCase() + 's';
  }
  return queryPass;
}

let addConditionAnnotations = (queryPass, level, id) => {
  let condition = '';
  if ( level !== null) {
    condition = ' AND ' + level.toLowerCase() + 's.id=' + id;
    if ( level !== 'Concepts') {
      condition = condition + ' AND ' + level.toLowerCase() + 's.id=annotations.' + level.toLowerCase() + 'id';
    }
  }
  return queryPass + condition;
}

app.get('/api/annotations', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    let level1 = req.query.level1;
    let id = req.query.id;
    let level2 = null;
    let level1Id = null;
    let level3 = null;
    let level2Id = null;
    if (req.query.level2) {
      level1Id = req.query.level1Id;
      level2 = req.query.level2;
    }
    if (req.query.level3) {
      level2Id = req.query.level2Id;
      level3 = req.query.level3;
    }
    //Build query string
    let queryPass = '';

    queryPass = 'SELECT annotations.id, annotations.comment, annotations.unsure, annotations.timeinvideo, annotations.x1, annotations.y1, \
                 annotations.x2, annotations.y2, annotations.videoWidth, annotations.videoHeight, \
                 annotations.imagewithbox, concepts.name FROM annotations, concepts';
    queryPass = addLevelAnnotations(queryPass, level1);
    queryPass = addLevelAnnotations(queryPass, level2);
    queryPass = addLevelAnnotations(queryPass, level3);
    queryPass = queryPass + ' WHERE concepts.id=annotations.conceptid';
    queryPass = addConditionAnnotations(queryPass, level1, (level1Id ? level1Id:id));
    queryPass = addConditionAnnotations(queryPass, level2, (level2Id ? level2Id:id));
    queryPass = addConditionAnnotations(queryPass, level3, id);
    let userId = req.user.id;
    let params = [];
    [queryPass, params] = checkAdminAnnotation(req.query.admin, userId, queryPass, params);
    queryPass = checkUnsureAnnotation(req.query.unsureOnly, queryPass);
    queryPass = queryPass + ' ORDER BY annotations.timeinvideo';
    try {
      const annotations = await psql.query(queryPass, params);
      res.json(annotations.rows);
    } catch (error) {
      res.json(error);
    }
  }
);

app.get('/api/annotationImage/:name', (req, res) => {
  let s3 = new AWS.S3();
  let key = process.env.AWS_S3_BUCKET_ANNOTATIONS_FOLDER + req.params.name;
  var params = {
    Key: key,
    Bucket: process.env.AWS_S3_BUCKET_NAME,
  };
  s3.getObject(params, async (err, data) => {
    if (err) {
      res.json(err);
    }
    else {
      res.json({image: data.Body});
    }
  })
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

async function getVideoId(value) {
  queryPass = 'select id from videos where videos.filename=$1';
  try {
    const user = await psql.query(queryPass,[value]);
    return user.rows[0].id;
  } catch (error) {
    console.log(error);
  }
}

async function getConceptId(value) {
  //Not yet supported
  queryPass = 'select id from concepts where concepts.name=$1';
  try {
    const queryRes = await psql.query(queryPass,[value]);
    return queryRes.rows[0].id;
  } catch (error) {
    console.log(error);
  }
}

app.post('/api/annotate', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  let videoId = await getVideoId(req.body.videoFilename);
  let userId = req.user.id;
  let conceptId = await getConceptId(req.body.conceptId);
  data = [videoId,
      userId,
      conceptId,
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
      req.body.unsure];
  queryText = 'INSERT INTO annotations(videoid, userid, conceptid, timeinvideo, x1, \
               y1, x2, y2, videoWidth, videoHeight, image, imagewithbox, comment, unsure, dateannotated) \
               VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, current_timestamp) RETURNING *';
  try {
    let insertRes = await psql.query(queryText,data);
    res.json({message: "Annotated", value: JSON.stringify(insertRes.rows[0])});
  } catch(error) {
    console.log(error)
    res.status(400).json(error);
  }
});

app.post('/api/uploadImage', passport.authenticate('jwt', {session: false}), (req, res) => {
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

app.post('/api/editAnnotation', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'UPDATE annotations \
                 SET conceptid = $1, comment = $2, unsure = $3 \
                 WHERE annotations.id=$4 OR annotations.originalid=$4 RETURNING *';
    queryUpdate = 'SELECT annotations.id, annotations.comment, annotations.unsure, annotations.timeinvideo, annotations.x1, annotations.y1, \
                 annotations.x2, annotations.y2, annotations.videoWidth, annotations.videoHeight, \
                 annotations.imagewithbox, concepts.name FROM annotations, concepts \
                 WHERE annotations.id = $1 AND annotations.conceptid=concepts.id';
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

app.post('/api/delete', passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    queryText = 'DELETE FROM annotations WHERE annotations.id=$1 RETURNING *';
    try {
      var deleteRes = await psql.query(queryText, [req.body.id]);
      res.json(deleteRes.rows);
    } catch (error) {
      console.log(error);
      res.status(400).json(error);
    }
  }
);

app.post("/updateImage", passport.authenticate('jwt', {session: false}),
  async (req, res) => {
  //id | videoid | userid | conceptid | timeinvideo | topRightx | topRighty | botLeftx | botLefty | dateannotated
  //get videoId
  let queryText = 'UPDATE annotations SET image=$1 WHERE id=$2 RETURNING *';
  let name = req.body.id;
  if (req.body.box) {
    queryText = 'UPDATE annotations SET imagewithbox=$1 WHERE id=$2 RETURNING *';
    name = name + '_box';
  }
  try {
    let updateRes = await psql.query(queryText, [name+'.png', req.body.id]);
    console.log(updateRes.rows);
    res.json({message: "Updated", value: JSON.stringify(updateRes.rows[0])});
  } catch(error) {
    console.log(error)
    res.json({message: "error: "+error})
  }
});

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

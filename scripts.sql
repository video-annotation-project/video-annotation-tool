/*
  Create SQL Tables
  The following lines of code initialize tables in mySQL. Each
  block has information about a table's column names, variable
  types... etc.
*/

/*
  Videos
  This table will represent each video from MBARI.
  id - Primary Key
  fileName - Video's name
  gpsStart - Coordinates where the video starts
  gpsStop - Coordinates where the video ends
*/
CREATE TABLE Videos (
  id SERIAL PRIMARY KEY,
  fileName text NOT NULL,
  gpsStart Point,
  gpsStop Point,
  startTime TIMESTAMP WITHOUT TIME ZONE,
  endTime TIMESTAMP WITHOUT TIME ZONE,
  startDepth int,
  endDepth int,
  description text,
  fps DOUBLE PRECISION 
);

/*
  Users
  This table will represent each user.
  id - Primary Key
  username - user's login name
  passsword - user's login password
  admin - Boolean - Whether user is admin
*/
CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  admin BOOLEAN DEFAULT FALSE
);

/*
  Concepts
  This table will represent each node in
  the hierarchical species tree.
  id - Primary Key
  name - node's name
  parent - name of node's parent node
  picture - filename for species image
*/
CREATE TABLE Concepts (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  rank text NOT NULL,
  parent int DEFAULT 0,
  picture text,
  foreign key (parent) references Concepts
);

/*
  Profile
  This table represents each user and what they
  are trying to profile during the video.
  id - Primary Key
  userID - Foreign Key references Users(id)
  conceptID - Foreign key references Concepts(id)
*/
CREATE TABLE Profile (
  id SERIAL PRIMARY KEY,
  userID int NOT NULL,
  conceptID int NOT NULL,
  FOREIGN KEY (userID) REFERENCES Users,
  FOREIGN KEY (conceptID) REFERENCES Concepts
);

/*
  Annotations
  This table represents each classified box.
  id - Primary Key
  videoID - Foreign Key references Videos(id)
  userID - Foreign Key references Users(id)
  conceptID - Foreign Key references Concepts(id)
  TimeInVideo - The number of ms in the video the profile was made
  topRightX - pixel representing profile box
  topRightY - Profile box
  botLeftX - Profile box
  botLeftY - Profile box
  DateAnnotated - Date of classification
  image - name of annotation image in s3 bucket
  imagewithbox - name of annotation image with bounding box in s3 bucket
  comment - comment left by annotator
  unsure - t/f value left by annotator
  originalid - id of original annotation used for tracking annotations
  framenum - frame number of annotation
  speed - used for filtering out bad tracking annotations 
*/
CREATE TABLE Annotations (
  id SERIAL PRIMARY KEY,
  videoID int NOT NULL,
  userID int NOT NULL,
  conceptID int NOT NULL,
  TimeInVideo DOUBLE PRECISION NOT NULL,
  x1 DOUBLE PRECISION NOT NULL,
  y1 DOUBLE PRECISION NOT NULL,
  x2 DOUBLE PRECISION NOT NULL,
  y2 DOUBLE PRECISION NOT NULL,
  videoWidth DOUBLE PRECISION NOT NULL,
  videoHeight DOUBLE PRECISION NOT NULL,
  DateAnnotated DATE NOT NULL,
  image TEXT NOT NULL,
  imagewithbox TEXT NOT NULL,
  comment TEXT,
  unsure BOOLEAN,
  originalid int,
  framenum int,
  speed DOUBLE PRECISION,
  verifieddate TIMESTAMP WITHOUT TIME ZONE,
  verifiedby int,
  FOREIGN KEY (videoID) REFERENCES Videos,
  FOREIGN KEY (userID) REFERENCES Users,
  FOREIGN KEY (conceptID) REFERENCES Concepts
);

/*
  Checkpoints
  This table updates where a user is time-wise in each video.
  userid - Foreign Key references Users(id)
  videoid - Foreign Key references Videos(id)
  timeinvideo - user's time in specific video
  timestamp - time logged
  finished - boolean, states whether user has finished video or not
*/

CREATE TABLE Checkpoints (
  userid int NOT NULL,
  videoid int NOT NULL,
  timeinvideo DOUBLE PRECISION NOT NULL,
  timestamp text NOT NULL,
  finished BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (videoid) REFERENCES Videos,
  FOREIGN KEY (userid) REFERENCES Users
);

/*
  previous_runs
  This table keeps track of previous training
  runs of a particular model.
*/
CREATE TABLE previous_runs (
  id serial PRIMARY KEY,
  model_name text,
  start_train timestamp,
  end_train timestamp,
  min_examples integer,
  epochs integer,
  concepts integer[],
  videos integer[],
  users integer[],
  std_out text,
  std_err text
);

/* 
  training_progress
  This table keeps track of the current progress
  on a training model.
*/

CREATE TABLE training_progress (
  id serial PRIMARY KEY,
  running bool,
  curr_epoch integer,
  max_epoch integer,
  curr_batch integer,
  steps_per_epoch integer
);


INSERT INTO users(username, password, admin) VALUES('admin', '$2b$10$cTBlJX8aQC8joysM78ZTtuAj5vW55Trwuy6kYe.PbY/m1wzQFsA1a', true);

create database dbname
	with owner "psMaster";

create sequence concept_id_seq;

alter sequence concept_id_seq owner to "psMaster";

create table concepts
(
	id serial not null
		constraint concepts_pkey
			primary key,
	name text not null
		constraint unique_name
			unique,
	rank text,
	parent integer default 0,
	picture text default 'none.png'::text
);

alter table concepts owner to "psMaster";

create table videos
(
	id serial not null
		constraint videos_pkey
			primary key,
	filename text not null,
	gpsstart point,
	gpsstop point,
	starttime timestamp,
	endtime timestamp,
	startdepth integer,
	enddepth integer,
	description text default ''::text,
	fps double precision,
	goodvideo boolean default false
);

alter table videos owner to "psMaster";

create table users
(
	id serial not null
		constraint users_pkey
			primary key,
	username text not null
		constraint users_username_key
			unique,
	password text not null,
	admin boolean default false
);

alter table users owner to "psMaster";

create table profile
(
	id serial not null
		constraint profile_pkey
			primary key,
	userid integer not null
		constraint profile_userid_fkey
			references users,
	conceptid integer not null,
	conceptidx integer default 0,
	constraint uniqueconceptid
		unique (userid, conceptid)
);

alter table profile owner to "psMaster";

create table annotations
(
	id serial not null
		constraint annotations_pkey
			primary key,
	videoid integer not null
		constraint annotations_videoid_fkey
			references videos,
	userid integer not null
		constraint annotations_userid_fk
			references users
				on delete cascade,
	conceptid integer not null
		constraint annotations_conceptid_fk
			references concepts,
	timeinvideo double precision not null,
	x1 double precision not null,
	y1 double precision not null,
	x2 double precision not null,
	y2 double precision not null,
	videowidth double precision not null,
	videoheight double precision not null,
	dateannotated date not null,
	image text,
	comment text,
	unsure boolean default false,
	originalid integer,
	framenum integer,
	speed double precision,
	verifieddate timestamp,
	verifiedby integer,
	priority integer default 0,
	oldconceptid integer
		constraint annotations_oldconceptid_fk
			references concepts,
	oldx1 double precision,
	oldy1 double precision,
	oldx2 double precision,
	oldy2 double precision,
	tracking_flag boolean
);

alter table annotations owner to "psMaster";

create table checkpoints
(
	userid integer not null
		constraint checkpoints_userid_fkey
			references users,
	videoid integer not null
		constraint checkpoints_videoid_fkey
			references videos,
	timeinvideo double precision not null,
	timestamp text not null,
	finished boolean default false
);

alter table checkpoints owner to "psMaster";

create table models
(
	name text not null
		constraint unqiue_model_name
			unique,
	timestamp timestamp not null,
	concepts integer[],
	verificationvideos integer[],
	userid integer
);

alter table models owner to "psMaster";

create table training_progress
(
	status integer,
	curr_epoch integer,
	max_epoch integer,
	curr_batch integer,
	steps_per_epoch integer,
	std_out text default ''::text,
	std_err text default ''::text,
	job_id text,
	stop_flag boolean default false
);

alter table training_progress owner to "psMaster";

create table ai_videos
(
	id serial not null
		constraint ai_videos_pkey
			primary key,
	name text not null
		constraint ai_videos_name_key
			unique
);

alter table ai_videos owner to "psMaster";

create table predict_progress
(
	videoid integer not null
		constraint predict_progress_videoid_key
			unique,
	framenum integer,
	totalframe integer,
	status integer,
	current_video integer default 0,
	total_videos integer default 0
);

alter table predict_progress owner to "psMaster";

create table previous_runs
(
	id serial not null
		constraint previous_runs_pkey
			primary key,
	model_name text,
	start_train timestamp,
	end_train timestamp,
	min_examples integer,
	epochs integer,
	collection_ids integer[],
	job_id text
);

alter table previous_runs owner to "psMaster";

create table video_collection
(
	id serial not null
		constraint video_collection_pkey
			primary key,
	name text
		constraint video_collection_name_key
			unique,
	description text
);

alter table video_collection owner to "psMaster";

create table video_intermediate
(
	id integer
		constraint video_intermediate_id_fkey
			references video_collection
				on delete cascade,
	videoid integer
		constraint video_intermediate_videoid_fkey
			references videos,
	constraint two_columns_u
		unique (id, videoid)
);

alter table video_intermediate owner to "psMaster";

create table annotation_collection
(
	id serial not null
		constraint annotation_collection_pkey
			primary key,
	name text
		constraint annotation_collection_name_key
			unique,
	description text,
	users text[] default '{}'::text[],
	videos integer[] default '{}'::integer[],
	concepts text[] default '{}'::text[],
	tracking boolean default false,
	conceptid integer[]
);

alter table annotation_collection owner to "psMaster";

create table annotation_intermediate
(
	id integer
		constraint annotation_intermediate_id_fkey
			references annotation_collection
				on delete cascade,
	annotationid integer
		constraint annotation_intermediate_annotationid_fk
			references annotations
				on delete cascade,
	constraint two_columns_u_annotation
		unique (id, annotationid)
);

alter table annotation_intermediate owner to "psMaster";

create table concept_collection
(
	id serial not null
		constraint concept_collection_pkey
			primary key,
	name text
		constraint concept_collection_name_key
			unique,
	description text
);

alter table concept_collection owner to "psMaster";

create table concept_intermediate
(
	id integer
		constraint concept_intermediate_id_fkey
			references concept_collection
				on delete cascade,
	conceptid integer
		constraint concept_intermediate_conceptid_fkey
			references concepts,
	constraint two_columns_u_concepts
		unique (id, conceptid)
);

alter table concept_intermediate owner to "psMaster";

create table model_params
(
	option text,
	epochs integer,
	min_images integer,
	model text,
	annotation_collections integer[],
	verified_only boolean,
	include_tracking boolean
);

alter table model_params owner to "psMaster";

create table predict_params
(
	model text,
	userid integer,
	concepts integer[],
	upload_annotations boolean,
	videos integer[]
);

alter table predict_params owner to "psMaster";

create table verified_frames
(
	videoid integer not null,
	framenum integer not null,
	constraint verified_frame
		primary key (videoid, framenum)
);

alter table verified_frames owner to "psMaster";
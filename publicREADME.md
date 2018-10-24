# Video Annotation Tool

Video Annotation Tool is a web app with a NodeJS back end and a ReactJS front end. Linked to your own AWS S3 bucket and Postgres database, this tool will allow users to annotate frames of videos with a drag-and-drop box. Whenever an annotation is made, an image of the annotation will be captured and sent to the appropriate folder in your S3 bucket. You can then use these annotations to train neural networks to predict future annotations!

Our own app used for deep sea annotations is live [here](https://www.deepseaannotations.com/).

## Installation
**Envrionment**
To set up the project environment, run the following commands.
```
git clone git@github.com:ishaanj1/video-annotation-tool.git
cd video-annotation-tool/
sudo apt install npm
npm install
cd client/
npm install
cd ..
```
#### Linking your AWS and DB accounts
To link your AWS bucket and Postgres database, open the `.env` file in the root of the project. In this file you will need to supply your AWS info, DB info, and a JWT key. The JWT key can be anything you like. It simply allows us to pass JSON objects between the server and client.

For AWS variables ending with ` _FOLDER `, enter the name of the appropriate AWS folder within your S3 bucket, with the forward slash. Ex: ` AWS_S3_BUCKET_ANNOTATIONS_FOLDER = 
annotations/`.

Don't worry about your secrets being exposed, ```.env``` is added to ```.gitignore```, so they won't be committed to your own repository.

#### Setting up your DB
There is a file named `scripts.sql` in the root of the project. This folder contains the scripts for creating the appropriate tables within your database. Execute this command only once to initialize these tables.
```psql -h <hostname> -f scripts.sql -U <username> <dbname>```

#### You're ready!
Run ``` npm start ``` (in the root of the project) to start the development version. A new window in your browser routed to ```localhost:3000``` should appear with the app.



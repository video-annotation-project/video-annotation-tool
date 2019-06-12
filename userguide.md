# Video Annotation Tool

Video Annotation Tool is a web app with a NodeJS back end and a ReactJS front end. Linked to your own AWS S3 bucket and Postgres database, this tool will allow users to annotate frames of videos with a drag-and-drop box. Whenever an annotation is made, an image of the annotation will be captured and sent to the appropriate folder in your S3 bucket. You can then use these annotations to train neural networks to predict future annotations!

Our own app used for deep sea annotations is live [here](https://www.deepseaannotations.com/).

## Installation
### Envrionment
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
### Setting up your AWS account
Our project relies entirely upon AWS for hosting our database, webserver, video/image files, and machine learning EC2 instances. You will need to set up the various Amazon Web Services to be able to use the source code.

#### S3 Bucket
First, create a S3 bucket where you will store all of your videos, images, and model files. If you have never done this before, you can follow [this tutorial](https://docs.aws.amazon.com/quickstarts/latest/s3backup/step-1-create-bucket.html). Once you have your bucket, create four folders inside:
- annotations (for the annotation images, with and without bounding boxes, which will be used for model training)
- concept_images 
- models 
- videos (for the videos that will be annotated on the website as well as videos that will be generated with tracking and displayed in the report tab)

#### RDS Database
You will need to create an RDS DB instance to host your database. If you have never done this before, you can follow [this tutorial](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Tutorials.WebServerDB.CreateDBInstance.html). Make sure you choose a postgres database when selecting the type. Dont follow the next tutorial linked at the bottom of the page. 

We used Elastic Beanstalk to deploy and manage our web app. Below are steps to show you how to configure and deploy the web app.

Prerequisites:
You will need to install and configure the EB CLI. See [Install the EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) and [Configure the EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-configuration.html). When configuring, make sure you enter 'video-annotation-tool' as the name of the folder in step 4.

Creating EB environment:
1. Navigate to video-annotation-tool and create an eb environment with the **eb init** command, replacing us-west-2 with your own region.
`eb init --platform node.js --region us-west-2`



#### EC2 Instances


To create the instances, you can reference [this tutorial](https://docs.aws.amazon.com/efs/latest/ug/gs-step-one-create-ec2-resources.html). 
- tracking
   * select the --insert name here-- AMI 



#### Linking your AWS and DB accounts
To link your AWS bucket and Postgres database, open the `.env` file in the root of the project. In this file you will need to supply your AWS info, DB info, and a JWT key. The JWT key can be anything you like. It simply allows us to pass JSON objects between the server and client.

For AWS variables ending with ` _FOLDER `, enter the name of the appropriate AWS folder within your S3 bucket, with the forward slash. Ex: ` AWS_S3_BUCKET_ANNOTATIONS_FOLDER = 
annotations/`.

Don't worry about your secrets being exposed, ```.env``` is added to ```.gitignore```, so they won't be committed to your own repository.

#### Setting up your DB
There is a file named `scripts.sql` in the root of the project. This folder contains the scripts for creating the appropriate tables within your database. It will also create a default 'admin' user with the password '123'. Execute this command only once to initialize these tables.

```psql -h <hostname> -f scripts.sql -U <username> <dbname>```

#### You're ready!
Run ``` npm start ``` (in the root of the project) to start the development version. A new window in your browser routed to ```localhost:3000``` should appear with the app. Login using the default admin credentials above!



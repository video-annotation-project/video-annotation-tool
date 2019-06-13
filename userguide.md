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

### S3 Bucket
First, create a S3 bucket where you will store all of your videos, images, and model files. If you have never done this before, you can follow [this tutorial](https://docs.aws.amazon.com/quickstarts/latest/s3backup/step-1-create-bucket.html). Once you have your bucket, create four folders inside:
- annotations (for the annotation images, with and without bounding boxes, which will be used for model training)
- concept_images 
- models 
- videos (for the videos that will be annotated on the website as well as videos that will be generated with tracking and displayed in the report tab)

You will need to upload your videos to the videos folder and any concept images to the concept_images folder. You can name your bucket and the folders whatever you like, you will just need to supply them in the `.env` file later.

### EC2 Instances

To create the instances, you can reference [this tutorial](https://docs.aws.amazon.com/efs/latest/ug/gs-step-one-create-ec2-resources.html). Be sure to choose an ubuntu server AMI. You will need to clone the git repo and follow the environment project setup step on all of them.     

**Tracking Instance**   
  * When creating this instance, make sure to add extra storage space (NOT MEMORY, 32Gigs on an ssd should be enough). We used a c5.4xlarge.
  1. On this EC2 you will need to install OpenCV. Note this is a somewhat lengthy process. Here is a link to the [tutorial](https://www.pyimagesearch.com/2015/07/20/install-opencv-3-0-and-python-3-4-on-ubuntu/). **IMPORTANT!** Before setting up the build in step 3, make sure you add '-DWITH_FFMPEG=ON' to the 'cmake -D' command.
  2. Once you are done installing OpenCV, you will have to pip install a bunch of packages (Make sure to be doing everything on python 3.6 and in your virtual env (usually named 'cv'))
  ```
   pip install python-dotenv
   pip install keras
   pip install boto3
   pip install tensorflow
   sudo apt install ffmpeg
   sudo apt-get install libpq-dev
   ```
   3. Your tracking EC2 is ready to go! Just run  
     ``` 
     cd aiAnnotations    
     nohup python annotateAll.py &
     ```  
  * This will automatically generate a new video that tracks an object whenever an annotation is made. The video will be stored in your videos folder within your S3 bucket, and can be viewed in the report tab of the website.
  * You can view the status of the program with `tail nohup.out`
  * Note: This script runs constantly, always looking for a new annotation to track.  

**Training Instance**  
  * For this instance, we recommend a much larger EC2 with more GPUs, like a g3.16x large.

**Predictions Instance**  


### RDS Database
1. You will need to create an RDS DB instance to host your database. If you have never done this before, you can follow [this tutorial](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Tutorials.WebServerDB.CreateDBInstance.html). Make sure you choose a postgres database when selecting the type. Do not follow the 'Next Step' tutorial linked at the bottom.

2. You will need to install [psql](http://postgresguide.com/setup/install.html) if you do not have it already. [Here](http://postgresguide.com/utilities/psql.html) is a very useful list of commands to interact with the DB.

3. There is a file named `scripts.sql` in the root of the project. This folder contains the scripts for creating the appropriate tables within your database. It will also create a default 'admin' user with the password '123'.  
**Execute this command only once to initialize these tables**:  
```psql -h hostname -d databasename -U username -f scripts.sql```

### Linking your AWS and DB accounts
To link your AWS bucket and Postgres database, open the `.env` file in the root of the project. In this file you will need to supply your AWS info, DB info, and a JWT key. The JWT key can be anything you like. It simply allows us to pass JSON objects between the server and client.

For AWS variables ending with ` _FOLDER `, enter the name of the appropriate AWS folder within your S3 bucket, with the forward slash. Ex: ` AWS_S3_BUCKET_ANNOTATIONS_FOLDER = 
annotations/`.

Don't worry about your secrets being exposed, ```.env``` is added to ```.gitignore```, so they won't be committed to your own repository.

### Elastic Beanstalk
We used Elastic Beanstalk to deploy and manage our web app. Follow these instructions to be able to deploy and manage the web app.

1. You will need to install and configure the EB CLI.
See [Install the EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) and [Configure the EB CLI](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-configuration.html). When configuring, make sure you enter 'video-annotation-tool' as the name of the folder in step 4.

2. Navigate to video-annotation-tool and create an eb environment by running  
`~/video-annotation-tool$ eb init`  
You will be prompted to enter your AWS access keys.  
You will then be prompted to choose your region and application - select video-annotation-tool for the application.

3. Finally, deploy!

``` 
cd ~/video-annotation-tool/client
npm run build
cd ..
eb deploy
```
The environment will be updated after a few minutes. After the environment is green and ready, verify by refreshing your browser and making sure the changes are there.
To terminate this environment and its resources, you can use ```eb terminate```.

## Development
You can run ``` npm start ``` (in the root of the project) to start the development version. A new window in your browser routed to ```localhost:3000``` should appear with the app. Login using the default admin credentials above. Make sure to create a new user and remove the default admin user from your database afterwards!



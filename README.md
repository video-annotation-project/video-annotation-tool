## Welcome to Deep Sea Classifier

### To Do:

- Work on sign in/home page
- Embed mp4 video on aws server
- Set up domain name deepWaterAnnotator.com
- Admin page with Info, Users, Reports tabs
- Users page with Info, Select Concept, Select Videos,  Annotate Video, Any Video tabs
  - Annotate Video tab has Start Now button
  - button leads to a new video or a partly complete one
- v2.0.0 features:
  - During playback, display each label from -5 to 0 sec relative to label timestamp
  - Keystroke shortcuts
  - Playback speed controls

### Done:

- Wrote create table statements in psql
- Parse json file for concept images
- Put images in s3 storage
- Finish setting up basic aws EC2
- Set up database with postgresql
- Make Users table
- Add basic sign in
- Add encrytion to password

### Basic Ubuntu


To update repositories:
<pre>
sudo apt-get update
</pre>


To make update:
```
sudo apt-get upgrade
```


To install a package through command line:
```
sudo apt-get install [packageName]
```


To install screenshot software:
```
sudo apt-get install shutter
```


To run screenshot software:
```
shutter
```
To change screen size:


![Setting click](https://i.imgur.com/SxhAJwm.png)


Then click 'System settings..'


![Settings](https://i.imgur.com/YEljcPC.png)


![Settings](https://i.imgur.com/pXLa4r5.png)


## Overview

A Webpack development server is configured to run on `localhost:3000`. This development server will bundle all static assets located under `client/src/`. All requests to `localhost:3000` will serve `client/index.html` which will include Webpack's `bundle.js`.

The user's browser visits the Webpack dev server at `localhost:3000`. React components communicate with the API server (`server.js`) when needed, at `localhost:3001`.

![Flow diagram](./flow-diagram.png)

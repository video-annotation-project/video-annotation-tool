## Welcome to Video Annotation Tool
This application is live at https://www.deepseaannotations.com/

### How to run the development version on your local computer:

Run the following commands in your command prompt to set up the project environment.
```
git clone git@github.com:ishaanj1/video-annotation-tool.git
cd video-annotation-tool/
sudo apt install npm
npm install
cd client/
npm install
cd ..
```
Now that the project environment is set up, run `npm start` to run the code.

### How to deploy

#### Download aws elastic beanstalk

#### Configure 

![Config EB](https://imgur.com/a/qeg1ezF.png)

#### Deploy

```
cd ~/video-annotation-tool/client
npm run build
cd ..
eb deploy --staged
```

### Task list:
Our task list is a shared private document located
[here](https://docs.google.com/document/d/16zIdhcf8k0fMssgTFSHqLqmJxHvxEBnoGhTnfB3KWcs/edit).
Contact a team member if you don't have permission to view.

### Coding/Style guide:
* All code should have a purpose (unnecessary/redundant code introduces bugs and
  confuses people)
* Coding style should be consistent. This includes:
  * Indent correctly
  * Keep lines from exceeding 80 characters
  * Terminate JavaScript statements with semicolons
  * Use arrow functions

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


### Extra info:

A Webpack development server is configured to run on `localhost:3000`. This development server will bundle all static assets located under `client/src/`. All requests to `localhost:3000` will serve `client/index.html` which will include Webpack's `bundle.js`.

The user's browser visits the Webpack dev server at `localhost:3000`. React components communicate with the API server (`server.js`) when needed, at `localhost:3001`.

![Flow diagram](./flow-diagram.png)

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

[Guide](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html)

#### Configure

![ConfigEB](https://i.imgur.com/YZwkbY8.png)

#### Deploy

```
cd ~/video-annotation-tool/client
npm run build
cd ..
eb deploy --staged
```

### Configuring Tensorboard
To install tensorboard on your instance, SSH into the instance and run
```
pip install tensorboard
```

Tensorboard is its own webserver running on Flask. It must run separate from the main website. We have Tensorboard running on port 6008, so ensure that this port is included in your instances security group. You will also want to proxy pass your tensorboard subdomain to this port. You can do this through an nginx configuration. This would look like

tensboard.conf
```
server {
    listen 8080;
    server_name tensorboard.yourdomain.com;

    location / {
        proxy_pass http://localhost:6008;
    }   
}
```

This file should be placed in the `/etc/nginx/conf.d/`folder. This will allow the tensorboard server to be located at tensorboard.yourdomain.com .

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

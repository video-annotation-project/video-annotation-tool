import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Grid, Typography } from '@material-ui/core';
import Avatar from '@material-ui/core/Avatar';

import './main.css';

const styles = theme => ({
  bigAvatar: {
    margin: 10,
    width: 250,
    height: 250
  }
});

class WebsiteDescription extends Component {
  render() {
    const { classes } = this.props;
    return (
      <div className="users body-container">
        <div>
          <img
            class="jelly"
            src={`https://cdn.deepseaannotations.com/home_images/jelly.png`}
            alt="sketch of a jellyfish"
          />

          <p>
            As California explores opportunities to develop offshore renewable
            energy capacity, there will be a growing need for pre-construction
            biological surveys and post-construction monitoring in the
            challenging marine environment. Underwater video is a powerful tool
            to facilitate such surveys, but the interpretation of the imagery is
            costly and time-consuming. Emerging technologies have greatly
            improved automated analysis of underwater video, but these
            technologies are not yet accurate or accessible enough for
            widespread adoption in the scientific community or industries that
            might benefit from these tools.
          </p>

          <p>
            To address these challenges, we developed a website that allows us
            to: <br />
            &nbsp;&nbsp;1. Quickly play and annotate underwater videos <br />
            &nbsp;&nbsp;2. Create a short tracing video for each annotation that
            shows how an annotated concept moves in time. <br />
            &nbsp;&nbsp;3. Verify the accuracy of existing annotations and
            tracing videos
            <br />
            &nbsp;&nbsp;4. Create a neural network model from existing
            annotations
            <br />
            &nbsp;&nbsp;5. Automatically annotate unwatched videos using a model
            that was previously created.
            <br />
          </p>

          <p>
            {' '}
            When using our website, the user first selects the concepts that
            they are interested in. They chose from a hierarchy of more than
            2,000 underwater species. Next, they can select the video they want
            to annotate, watch it, stop it at any point, and create bounding
            boxes around objects of interest and tag them with the appropriate
            concept name. Our software supports four lists of videos: "My In
            Progress Videos", which keeps track of the videos that are currently
            annotated by the user, "Unwatched videos", which have not been
            annotated, "Annotated Videos", which have been fully annotated, and
            "In progress videos", which are currently being annotated by
            someone. We use the Kernelized Correlation Filter algorithm to
            create additional annotations from tracing the object that is being
            annotated. Our verification tab allows the user to verify the
            validity of both user-created and tracing annotations in a
            collection of annotations. Our reporting tab can show annotations
            sorted by video, concept, or user, where there are additional
            options to show only verified annotations or annotations that are
            marked as unsure. Tracing annotations are not displayed in the
            reporting tool. Finally, the models tab allows the user to create
            and train a model and use a model on an unwatched video to
            automatically annotate it. We use the RetinaNet convolutional neural
            network as our model, where the initial weights are based on the
            COCO dataset.
          </p>

          <img
            class="line"
            src={`https://cdn.deepseaannotations.com/home_images/line.png`}
            alt="divider line"
          />

          <h1 id="team">Our Team</h1>
          <Grid container justify="center" alignItems="center">
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://content-calpoly-edu.s3.amazonaws.com/bio/1/documents/pdf/ruttenberg.jpg"
                alt="Benjamin Ruttenberg"
              />
              <Typography variant="subtitle2" align="center">
                Benjamin Ruttenberg <br /> Principal Investigator
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src={`https://cdn.deepseaannotations.com/home_images/lubo.jpg`}
                alt="Lubomir Stanchev"
              />
              <Typography variant="subtitle2" align="center">
                Lubomir Stanchev <br /> Principal Investigator
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQH8LK16hu1EZA/profile-displayphoto-shrink_200_200/0?e=1575504000&v=beta&t=XP-ryHpaAjNHS5p2T45DwUSGDQlPext6Vls-ENUkZI8"
                alt="Alexandra Wolman"
              />
              <Typography variant="subtitle2" align="center">
                Alexandra Wolman
                <br /> Project Supervisor
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQHPZnPOvSJcNg/profile-displayphoto-shrink_200_200/0?e=1575504000&v=beta&t=ia-0useE3FYtIiOiUinLb-tLJaDOBAdmQNVGO-BcOyI"
                alt="Hanson Egbert"
              />
              <Typography variant="subtitle2" align="center">
                Hanson Egbert <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQEYQOwLmSX2Hw/profile-displayphoto-shrink_800_800/0?e=1575504000&v=beta&t=aw3aU1PZoUJnY-46pe4a13FmVflLowFYb9UVshCzx_c"
                alt="Kyaw Soe"
              />
              <Typography variant="subtitle2" align="center">
                Kyaw Soe
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQG3bPB2RGh_Cg/profile-displayphoto-shrink_800_800/0?e=1575504000&v=beta&t=pFSo5aoPlwBjjdvOOzehx6u4BK6o7aREyEGOXaUWgwM"
                alt="Kyle Maxwell"
              />
              <Typography variant="subtitle2" align="center">
                Kyle Maxwell
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src={`https://cdn.deepseaannotations.com/home_images/trace.jpg`}
                alt="Trace Rainbolt"
              />
              <Typography variant="subtitle2" align="center">
                Trace Rainbolt
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQHDuZzywarL9g/profile-displayphoto-shrink_200_200/0?e=1575504000&v=beta&t=SYIoWjJRugTIrCHXYENM1-b04tQwjyfXLIqMZsFZuZQ"
                alt=" Samantha Gunzl"
              />
              <Typography variant="subtitle2" align="center">
                Samantha Gunzl
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src={`https://cdn.deepseaannotations.com/home_images/jacob.jpg`}
                alt="Jacob Territo"
              />
              <Typography variant="subtitle2" align="center">
                Jacob Territo
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src={`https://cdn.deepseaannotations.com/home_images/justin.jpg`}
                alt="Justin Cho"
              />
              <Typography variant="subtitle2" align="center">
                Justin Cho
                <br /> Software Developer
              </Typography>
            </div>
            <div>
              <Avatar
                className={classes.bigAvatar}
                src="https://media.licdn.com/dms/image/C5603AQFYvHgLASbWBA/profile-displayphoto-shrink_800_800/0?e=1575504000&v=beta&t=nayZ2NItYYWa0AcHA4JQRHKgQ0EqgkJPERq7bG5UpDs"
                alt="Kevin Label"
              />
              <Typography variant="subtitle2" align="center">
                Kevin Label
                <br /> Software Developer
              </Typography>
            </div>
          </Grid>

          <img
            class="line"
            src={`https://cdn.deepseaannotations.com/home_images/line.png`}
            alt="divider line"
          />

          <h1 id="project">Our Project</h1>

          <iframe
            title="Our Project"
            src={`https://cdn.deepseaannotations.com/home_images/news.pdf`}
            width="100%"
            height="1000px"
          ></iframe>

          <img
            class="line"
            src={`https://cdn.deepseaannotations.com/home_images/line.png`}
            alt="divider line"
          />

          <h1 id="software">Our Software</h1>
          <div class="software">
            <p>
              {' '}
              We used reactJS/nodeJS to build our website. We used a PostgreSQL
              database and AWS S3 buckets as our backend. The complete source
              code, including setup instructions, can be found{' '}
              <a href="http://github.com/video-annotation-project">
                here
              </a>.{' '}
            </p>
          </div>

          <img
            class="line"
            src={`https://cdn.deepseaannotations.com/home_images/line.png`}
            alt="divider line"
          />

          <img
            class="fish"
            src={`https://cdn.deepseaannotations.com/home_images/fish.png`}
            alt="sketch of multiple fish"
          />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(WebsiteDescription);

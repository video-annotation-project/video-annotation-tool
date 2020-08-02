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
  constructor(props) {
    super(props);
    this.state = {
      publicPath:
        'https://public-files-deep-sea-annotations.s3-us-west-1.amazonaws.com/home_files/',
      members: [
        {
          name: 'Benjamin Ruttenberg',
          role: 'Principal Investigator',
          img: 'ben.jpg'
        },
        {
          name: 'Lubomir Stanchev',
          role: 'Principal Investigator',
          img: 'lubo.jpg'
        },
        {
          name: 'Alexandra Wolman',
          role: 'Project Supervisor',
          img: 'ally.jpg'
        },
        {
          name: 'Hanson Egbert',
          role: 'Software Developer',
          img: 'hanson.jpg'
        },
        {
          name: 'Ishaan Jain',
          role: 'Software Developer',
          img: 'ishaan0.jpg'
        },
        {
          name: 'Jacob Territo',
          role: 'Software Developer',
          img: 'jacob.jpg'
        },
        {
          name: 'Samantha Gunzl',
          role: 'Software Developer',
          img: 'sam.jpg'
        },
        {
          name: 'Kyle Maxwell',
          role: 'Software Developer',
          img: 'kyle.jpg'
        },
        {
          name: 'Kyaw Soe',
          role: 'Software Developer',
          img: 'kyaw.jpg'
        },
        {
          name: 'Trace Rainbolt',
          role: 'Software Developer',
          img: 'trace.jpg'
        },
        {
          name: 'Justin Cho',
          role: 'Software Developer',
          img: 'justin.jpg'
        },
        {
          name: 'Kevin Label',
          role: 'Software Developer',
          img: 'kevin.jpg'
        },
        {
          name: 'Stephen Hung',
          role: 'Software Developer',
          img: 'stephen.jpg'
        },
        {
          name: 'Viet Nguyen',
          role: 'Software Developer',
          img: 'viet.jpg'
        },
        {
          name: 'Rachel Castellino',
          role: 'Software Developer',
          img: 'rachel.jpg'
        }
      ]
    };
  }
  render() {
    const { classes } = this.props;
    const { members, publicPath } = this.state;
    return (
      <div className="users body-container">
        <div>
          <img
            className="jelly"
            src={`${publicPath}jelly.png`}
            alt="sketch of a jellyfish"
          />

          <h1> Background</h1>
          <p>
            Recent discussions of installing Offshore Wind Farms (OFWF) along
            the California coast drives the need for Environmental Impact
            Assessment (EIA) of offshore, benthic environments. Current methods
            for assessing benthic habitats include costly research cruises to
            take benthic video that scientists then annotate by watching video
            and digitally tagging, identifying and cataloging each deep-sea
            organism. These methods are time consuming and expensive, which
            presents the need for a more efficient way to collect and manage
            benthic video data.
          </p>

          <h1> Project </h1>
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
          <h1> Implementation </h1>
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
            className="line"
            src={`${publicPath}line.png`}
            alt="divider line"
          />

          <h1 id="team">Our Team</h1>
          <Grid container justify="center" alignItems="center">
            {members.map(member => (
              <div key={member.name}>
                <Avatar
                  className={classes.bigAvatar}
                  src={`${publicPath}${member.img}`}
                  alt={member.name}
                />
                <Typography variant="subtitle2" align="center">
                  {member.name} <br /> {member.role}
                </Typography>
              </div>
            ))}
          </Grid>

          <img
            className="line"
            src={`${publicPath}line.png`}
            alt="divider line"
          />

          <h1 id="project">Our Project</h1>

          <embed
            title="Our Project"
            src={`${publicPath}news.pdf`}
            width="100%"
            height="1000px"
          ></embed>

          <img
            className="line"
            src={`${publicPath}line.png`}
            alt="divider line"
          />

          <h1 id="software">Our Software</h1>
          <div className="software">
            <p>
              {' '}
              We used reactJS/nodeJS to build our website. We used a PostgreSQL
              database and AWS S3 buckets as our backend. The complete source
              code, including setup instructions, can be found{' '}
              <a href="https://github.com/video-annotation-project">
                here
              </a>.{' '}
            </p>
          </div>

          <img
            className="line"
            src={`${publicPath}line.png`}
            alt="divider line"
          />

          <h1 id="acknowledgments"> Acknowledgments </h1>

          <div className="software">
            <p>
              {' '}
              This work has been sponsored by the California Energy Commission,
              Program: EPIC, Agreement Number: EPC-17-029. We would also like to
              acknowledge the general support of Amazon Web Services (AWS), who
              provided $50,000 in AWS credits. This work would also not be
              possible without the help of the Monterey Bay Aquarium Research
              Institute (MBARI), who provided 50 hours of high-definition
              breathtaking underwater videos.
            </p>
          </div>

          <img
            className="line"
            src={`${publicPath}line.png`}
            alt="divider line"
          />

          <img
            className="fish"
            src={`${publicPath}fish.png`}
            alt="sketch of multiple fish"
          />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(WebsiteDescription);

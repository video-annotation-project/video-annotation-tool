import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import { Checkbox } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  formControl: {
    marginTop: theme.spacing.unit * 2,
    maxHeight: "400px",
    overflow: "auto"
  },
  group: {
    marginLeft: 15
  }
});

class VerifySelectUser extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: []
    };
  }

  componentDidMount = async () => {
    let users = await this.props.getUsers();

    this.setState({
      users: users
    });

    if (
      users.some(user => user.id.toString() === localStorage.getItem("userid"))
    ) {
      this.props.selectUser(localStorage.getItem("userid"));
    }
  };

  render() {
    const { classes, value, handleChangeList } = this.props;

    return (
      <>
        <Typography>Select users</Typography>
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup
            aria-label="User"
            name="user"
            className={classes.group}
            value={value}
            onChange={handleChangeList}
          >
            {this.state.users.map(user => (
              <FormControlLabel
                key={user.id}
                value={user.id.toString()}
                control={<Checkbox color="primary" />}
                label={user.username}
                checked={this.props.value.includes(user.id.toString())}
              />
            ))}
          </FormGroup>
        </FormControl>
      </>
    );
  }
}

VerifySelectUser.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUser);

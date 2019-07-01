import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";
import FormGroup from "@material-ui/core/FormGroup";
import { Checkbox } from "@material-ui/core";

const styles = theme => ({
  formControl: {
    margin: theme.spacing.unit * 3,
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
  };

  render() {
    const { classes, value, handleChange } = this.props;

    return (
        <FormControl component="fieldset" className={classes.formControl}>
          <FormGroup
            aria-label="User"
            name="user"
            className={classes.group}
            value={value}
            onChange={handleChange}
          >
            <FormControlLabel
              key={-1}
              value={"-1"}
              control={<Checkbox color="primary" />}
              label="All users"
              checked={this.props.value.includes("-1")}
            />
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
    );
  }
}

VerifySelectUser.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUser);

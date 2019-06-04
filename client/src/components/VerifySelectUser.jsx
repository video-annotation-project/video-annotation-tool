import React from "react";
import PropTypes from "prop-types";
import { withStyles } from "@material-ui/core/styles";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormControl from "@material-ui/core/FormControl";

const styles = theme => ({
  root: {
    display: "flex"
  },
  formControl: {
    margin: theme.spacing.unit * 3
  },
  group: {
    margin: `${theme.spacing.unit}px 0`
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
      <div className={classes.root}>
        <FormControl component="fieldset" className={classes.formControl}>
          <RadioGroup
            aria-label="User"
            name="user"
            className={classes.group}
            value={value}
            onChange={handleChange}
          >
            <FormControlLabel
              key={0}
              value={"0"}
              control={<Radio color="primary" />}
              label={"All users"}
            />
            {this.state.users.map(user => (
              <FormControlLabel
                key={user.id}
                value={user.id.toString()}
                control={<Radio color="primary" />}
                label={user.username}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </div>
    );
  }
}

VerifySelectUser.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(VerifySelectUser);

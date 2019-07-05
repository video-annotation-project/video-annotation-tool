import React from "react";
import Button from "@material-ui/core/Button";
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';


const GeneralMenu = (props) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
  
    function handleClick(event) {
      setAnchorEl(event.currentTarget);
    }
  
    function handleClose() {
      setAnchorEl(null);
    }
  
    return (
      <div>
        <Button color="inherit" onClick={handleClick}>
          {props.name}
        </Button>
        <Menu
          id="simple-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          {props.items.map(item => (
            <MenuItem
              component={props.Link}
              to={item.link}
            >
              {item.name}
            </MenuItem>
          ))}
        </Menu>
      </div>
    );
  }

export default GeneralMenu;
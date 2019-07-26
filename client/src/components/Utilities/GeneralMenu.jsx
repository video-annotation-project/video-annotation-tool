/* eslint-disable react/destructuring-assignment */
import React from 'react';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

const GeneralMenu = props => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const color = props.color ? props.color : 'inherit';
  const variant = props.variant ? props.variant : 'text';

  function handleClick(event) {
    setAnchorEl(event.currentTarget);
  }

  function handleClose() {
    setAnchorEl(null);
  }

  function handleInsert(id) {
    handleClose();
    props.handleInsert(id);
  }
  return (
    <div>
      <Button
        variant={variant}
        color={color}
        onClick={handleClick}
        disabled={props.disabled}
      >
        {props.name}
      </Button>
      <Menu
        id="simple-menu"
        style={{ top: '30px' }}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {props.Link
          ? props.items.map(item => (
              <MenuItem
                key={item.name}
                component={props.Link}
                to={item.link}
                onClick={() => handleClose()}
              >
                {item.name}
              </MenuItem>
            ))
          : props.items.map(item => (
              <MenuItem key={item.name} onClick={() => handleInsert(item.id)}>
                {`${item.id} ${item.name}`}
              </MenuItem>
            ))}
      </Menu>
    </div>
  );
};

export default GeneralMenu;

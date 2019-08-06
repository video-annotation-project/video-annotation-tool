import React from 'react';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

const GeneralMenu = props => {
  const { disabled, name, Link, items } = props;
  let { color, variant } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  color = color || 'inherit';
  variant = variant || 'text';

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
        disabled={disabled}
      >
        {name}
      </Button>
      <Menu
        id="simple-menu"
        style={{ top: '30px' }}
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {Link
          ? items.map(item => (
              <MenuItem
                key={item.name}
                component={props.Link}
                to={item.link}
                onClick={() => handleClose()}
              >
                {item.name}
              </MenuItem>
            ))
          : items.map(item => (
              <MenuItem key={item.name} onClick={() => handleInsert(item.id)}>
                {`${item.id} ${item.name}`}
              </MenuItem>
            ))}
      </Menu>
    </div>
  );
};

export default GeneralMenu;

import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Table from '@material-ui/core/Table';
import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import Description from '@material-ui/icons/Description';
import { Typography, MenuItem } from '@material-ui/core';
import Select from '@material-ui/core/Select';
import FormControl from '@material-ui/core/FormControl';

const CustomTableCell = withStyles(theme => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontSize: 14
  },
  body: {
    fontSize: 14
  }
}))(TableCell);

const formatDate = version => {
  let d = new Date(version);
  return d.toUTCString().replace(' GMT', '');
};

const ModelsTable = props => {
  const { models, handleSelectVersion, handleOpenInfo, deleteModel } = props;

  if (!models) {
    return <Typography style={{ margin: '20px' }}>Loading...</Typography>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <CustomTableCell>Name</CustomTableCell>
          <CustomTableCell>Versions #</CustomTableCell>
          <CustomTableCell>Date Created</CustomTableCell>
          <CustomTableCell />
        </TableRow>
      </TableHead>
      <TableBody>
        {models.map(model => (
          <TableRow key={model.name}>
            <CustomTableCell component="th" scope="row">
              {model.name}
            </CustomTableCell>
            <CustomTableCell>
              <FormControl>
                <Select
                  value={model.version_selected}
                  renderValue={value => `${parseInt(value) + 1}`}
                  onChange={event => handleSelectVersion(event, model)}
                >
                  {model.versions.map((version, index) => (
                    <MenuItem key={index + version} value={index}>
                      {index + 1 + ' : ' + formatDate(version)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CustomTableCell>
            <CustomTableCell>{formatDate(model.timestamp)}</CustomTableCell>
            <CustomTableCell align="right">
              <IconButton
                onClick={() => handleOpenInfo(model)}
                aria-label="Description"
              >
                <Description />
              </IconButton>
              <IconButton
                onClick={() => deleteModel(model)}
                aria-label="Delete"
              >
                <DeleteIcon />
              </IconButton>
            </CustomTableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ModelsTable;

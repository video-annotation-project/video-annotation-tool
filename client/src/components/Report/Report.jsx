import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';

import ReportModal from './ReportModal';
import ReportTree from './ReportTree';

const styles = theme => ({
  root: {
    width: '100%',
    backgroundColor: '#132232'
  },
  openSelector: {
    position: 'sticky',
    margin: theme.spacing(1),
    top: 0,
    zIndex: 99
  }
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openReportModal: true,
      level1: '',
      level2: '',
      level3: '',
      renderTree: false,
      unsureOnly: false,
      verifiedCondition: 'all'
    };
  }

  setLevel = (level, value) => {
    this.setState({
      [level]: value
    });
  };

  setUnsureOnly = value => {
    this.setState({
      unsureOnly: value
    });
  };

  handleReportModalOpen = () => {
    this.setState({
      openReportModal: true,
      renderTree: false
    });
  };

  handleReportModalCancel = () => {
    this.setState({
      openReportModal: false
    });
  };

  handleReportModalOk = () => {
    const { level1, level2, level3 } = this.state;
    if (level1 === '') {
      return;
    }
    if (level2 === '' && level3 !== '') {
      return;
    }
    this.setState({
      renderTree: true,
      openReportModal: false
    });
  };

  handleVerifiedCondition = event => {
    this.setState({
      verifiedCondition: event.target.value
    });
  };

  render() {
    const { classes } = this.props;
    const {
      unsureOnly,
      verifiedCondition,
      level1,
      level2,
      level3,
      openReportModal,
      renderTree
    } = this.state;
    return (
      <div className={classes.root}>
        {openReportModal ? (
          ''
        ) : (
          <Button
            id="selector-button"
            className={classes.openSelector}
            variant="contained"
            color="primary"
            onClick={this.handleReportModalOpen}
          >
            Open Report Selector
          </Button>
        )}
        <ReportModal
          unsureOnly={unsureOnly}
          setUnsureOnly={this.setUnsureOnly}
          verifiedCondition={verifiedCondition}
          handleVerifiedCondition={this.handleVerifiedCondition}
          level1={level1}
          level2={level2}
          level3={level3}
          setLevel={this.setLevel}
          openReportModal={openReportModal}
          handleReportModalCancel={this.handleReportModalCancel}
          handleReportModalOk={this.handleReportModalOk}
        />
        {renderTree ? (
          <ReportTree
            treeDepth={0}
            queryConditions=""
            levels={[level1, level2, level3]}
            unsureOnly={unsureOnly}
            verifiedCondition={verifiedCondition}
          />
        ) : (
          <div />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(Report);

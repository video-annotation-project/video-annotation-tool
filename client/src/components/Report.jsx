import React from "react";

import { withStyles } from "@material-ui/core/styles";
import PropTypes from "prop-types";
import Button from "@material-ui/core/Button";

import ReportModal from "./ReportModal.jsx";
import ReportTree from "./ReportTree.jsx";

const styles = theme => ({
  root: {
    width: "100%",
    backgroundColor: theme.palette.background.paper
  }
});

class Report extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      openReportModal: false,
      level1: "",
      level2: "",
      level3: "",
      renderTree: false,
      unsureOnly: false,
      verifiedOnly: false,
      unverifiedOnly: false
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

  setVerifiedOnly = value => {
    this.setState({
      verifiedOnly: value
    });
  };

  setUnverifiedOnly = value => {
    this.setState({
      unverifiedOnly: value
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
    if (this.state.level1 === "") {
      return;
    }
    if (this.state.level2 === "" && this.state.level3 !== "") {
      return;
    }
    this.setState({
      renderTree: true,
      openReportModal: false
    });
  };

  render() {
    const { classes } = this.props;
    const {
      unsureOnly,
      verifiedOnly,
      unverifiedOnly,
      level1,
      level2,
      level3,
      openReportModal
    } = this.state;
    return (
      <div className={classes.root}>
        <Button onClick={this.handleReportModalOpen}>
          Open Report Selector
        </Button>
        <ReportModal
          unsureOnly={unsureOnly}
          setUnsureOnly={this.setUnsureOnly}
          verifiedOnly={verifiedOnly}
          setVerifiedOnly={this.setVerifiedOnly}
          unverifiedOnly={unverifiedOnly}
          setUnverifiedOnly={this.setUnverifiedOnly}
          level1={level1}
          level2={level2}
          level3={level3}
          setLevel={this.setLevel}
          openReportModal={openReportModal}
          handleReportModalCancel={this.handleReportModalCancel}
          handleReportModalOk={this.handleReportModalOk}
        />
        {this.state.renderTree ? (
          <ReportTree
            treeDepth={0}
            queryConditions={""}
            levels={[level1, level2, level3]}
            unsureOnly={this.state.unsureOnly}
            verifiedOnly={verifiedOnly}
            unverifiedOnly={unverifiedOnly}
          />
        ) : (
          <div />
        )}
      </div>
    );
  }
}

Report.propTypes = {
  classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Report);

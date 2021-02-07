import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SvgIcon from '@material-ui/core/SvgIcon';
import { fade, withStyles } from '@material-ui/core/styles';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem from '@material-ui/lab/TreeItem';
import Collapse from '@material-ui/core/Collapse';
import { useSpring, animated } from 'react-spring';

function MinusSquare(props) {
  return (
    <SvgIcon fontSize="inherit" {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}

function PlusSquare(props) {
  return (
    <SvgIcon fontSize="inherit" {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

function CloseSquare(props) {
  return (
    <SvgIcon className="close" fontSize="inherit" {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
    </SvgIcon>
  );
}

function TransitionComponent(props) {
  const style = useSpring({
    from: { opacity: 0, transform: 'translate3d(20px,0,0)' },
    to: {
      opacity: props.in ? 1 : 0,
      transform: `translate3d(${props.in ? 0 : 20}px,0,0)`
    }
  });

  return (
    <animated.div style={style}>
      <Collapse {...props} />
    </animated.div>
  );
}

const DisplayTree = props => {
  return (
    <div>
      {props.data.map(version =>
        version.children && version.children.length !== 0 ? (
          <StyledTreeItem
            value={version.id}
            key={version.id}
            nodeId={version.id}
            label={version.id}
            onClick={() => props.handleSelectVersion(version.id, props.name)}
          >
            <DisplayTree
              data={version.children}
              handleSelectVersion={props.handleSelectVersion}
              name={props.name}
            />
          </StyledTreeItem>
        ) : (
          <StyledTreeItem
            value={version.id}
            onClick={event => props.handleSelectVersion(version.id, props.name)}
            key={version.id}
            nodeId={version.id}
            label={version.id}
          />
        )
      )}
    </div>
  );
};

const styles = () => ({
  root: {
    flexGrow: 1,
    margin: 15,
    marginLeft: 20
  }
});

TransitionComponent.propTypes = {
  in: PropTypes.bool
};

const StyledTreeItem = withStyles(theme => ({
  iconContainer: {
    '& .close': {
      opacity: 0.3
    }
  },
  group: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeft: `1px dashed ${fade(theme.palette.text.primary, 0.4)}`
  }
}))(props => <TreeItem {...props} TransitionComponent={TransitionComponent} />);

class ModelTreeView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      versions: 0
    };
  }

  async componentDidMount() {
    const { model } = this.props;
    await this.TreeViewProcessor(model);
  }

  list_to_tree = list => {
    var map = {},
      node,
      roots = [],
      i;
    for (i = 0; i < list.length; i += 1) {
      map[list[i].id] = i; // initialize the map
      list[i].children = []; // initialize the children
    }
    for (i = 0; i < list.length; i += 1) {
      node = list[i];
      if (node.parentId !== '') {
        list[map[node.parentId]].children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  };

  TreeViewProcessor = model => {
    let versions = model.versions
      .replace('{', '')
      .replace('}', '')
      .split(',');
    let new_versions = [];
    versions.forEach(i => {
      new_versions.push({
        id: i,
        parentId: i.slice(0, i.lastIndexOf('.'))
      });
    });
    this.setState({
      versions: this.list_to_tree(new_versions)
    });
  };

  render() {
    const { handleSelectVersion, model, classes } = this.props;
    const { versions } = this.state;
    return (
      <div>
        {versions ? (
          <TreeView
            className={classes.root}
            defaultExpanded={[]}
            defaultCollapseIcon={<MinusSquare />}
            defaultExpandIcon={<PlusSquare />}
            defaultEndIcon={<CloseSquare />}
          >
            <DisplayTree
              name={model.name}
              data={versions}
              handleSelectVersion={handleSelectVersion}
            />
          </TreeView>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    );
  }
}

export default withStyles(styles)(ModelTreeView);

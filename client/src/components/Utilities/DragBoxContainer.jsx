import React, { Component } from 'react';
import Rnd from 'react-rnd';
import { withStyles } from '@material-ui/core/styles';

const styles = () => ({
  dragBox: {
    margin: '0px',
    backgroundColor: 'transparent',
    border: '2px coral solid',
    borderStyle: 'ridge'
  }
});

const DragBox = props => {
  const {
    name,
    dragBox,
    size,
    position,
    disabledMouse,
    onDragStop,
    onResize
  } = props;
  return (
    <Rnd
      id="dragBox"
      key={name}
      className={dragBox}
      size={size}
      position={position}
      maxWidth={900}
      maxHeight={650}
      bounds="parent"
      style={{ pointerEvents: disabledMouse ? 'none' : 'auto' }}
      onDragStop={onDragStop}
      onResize={onResize}
    />
  );
};

class DragBoxContainer extends Component {
  constructor(props) {
    super(props);
    const { drawDragBoxProp } = this.props;
    this.state = {
      boxCounter: 0,
      drawDragBox: drawDragBoxProp || false,
      disabledMouse: !drawDragBoxProp || false,
      showControls: false
    };

    this.resetDragBox = this.resetDragBox.bind(this);
    this.drawDragBox = this.drawDragBox.bind(this);
    this.createDragBox = this.createDragBox.bind(this);
    this.removeDragBox = this.removeDragBox.bind(this);
  }

  resetDragBox = async e => {
    const { onResize } = this.props;
    const { disableDraw, boxCounter, dragBoxX, dragBoxY } = this.state;
    e.preventDefault();

    if (disableDraw) {
      return;
    }

    const videoElement = document.getElementById('video');
    if (videoElement) {
      this.setState({ showControls: videoElement.controls });
      videoElement.controls = false;
    }

    const video = e.target;
    const dim = video.getBoundingClientRect();
    const x = e.clientX - dim.left;
    const y = e.clientY - dim.top;

    this.setState(
      {
        drawDragBox: true,
        boxCounter: boxCounter + 1,
        dragBoxX: x,
        dragBoxY: y,
        dragBoxWidth: 0,
        dragBoxHeight: 0,
        mouseDown: true,
        disabledMouse: true,
        disableDraw: false
      },
      () => {
        if (onResize) {
          onResize(e, null, { style: { width: 0, height: 0 } }, null, {
            x: dragBoxX,
            y: dragBoxY
          });
        }
      }
    );
  };

  drawDragBox = e => {
    const { onResize } = this.props;
    const { mouseDown, dragBoxX, dragBoxY, boxCounter } = this.state;
    e.preventDefault();

    if (mouseDown) {
      const video = e.target;
      const dim = video.getBoundingClientRect();
      const x = e.clientX - dim.left;
      const y = e.clientY - dim.top;

      const newWidth = x - dragBoxX;
      const newHeight = y - dragBoxY;

      // Passing direction and delta to onResize as null,
      // if necessary can be added in later
      if (onResize) {
        onResize(
          e,
          null,
          { style: { width: newWidth, height: newHeight } },
          null,
          { x: dragBoxX, y: dragBoxY }
        );
      }
      this.setState({
        boxCounter: boxCounter + 1,
        dragBoxWidth: newWidth,
        dragBoxHeight: newHeight
      });
    }
  };

  createDragBox = e => {
    const {
      disableDraw,
      dragBoxWidth,
      dragBoxHeight,
      showControls
    } = this.state;
    e.preventDefault();

    if (disableDraw) {
      return;
    }

    const boxLargeEnough = dragBoxWidth > 25 && dragBoxHeight > 25;

    this.setState({
      mouseDown: false,
      disabledMouse: false,
      drawDragBox: boxLargeEnough
    });

    const videoElement = document.getElementById('video');

    setTimeout(() => {
      if (videoElement) {
        videoElement.controls = showControls;
      }
    }, 100);
  };

  removeDragBox = e => {
    const { toggleDragBox } = this.props;
    e.preventDefault();
    this.setState({
      drawDragBox: false
    });
    if (toggleDragBox) {
      toggleDragBox();
    }
  };

  render() {
    const {
      className,
      children,
      size,
      position,
      dragBox,
      onResize,
      onDragStop,
      drawDragBoxProp
    } = this.props;
    const { drawDragBox, boxCounter, disabledMouse } = this.state;
    return (
      <div className={className}>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className={className}
          onMouseDown={e => this.resetDragBox(e)}
          onMouseMove={e => this.drawDragBox(e)}
          onMouseUp={e => this.createDragBox(e)}
          onPlay={e => {
            this.setState({ disableDraw: true });
            this.removeDragBox(e);
          }}
          onPause={() => this.setState({ disableDraw: false })}
        >
          {children}
        </div>
        {drawDragBox || drawDragBoxProp ? (
          <DragBox
            name={boxCounter}
            size={size}
            position={position}
            dragBox={dragBox}
            disabledMouse={disabledMouse}
            onResize={onResize}
            onDragStop={onDragStop}
          />
        ) : (
          <div />
        )}
      </div>
    );
  }
}

export default withStyles(styles)(DragBoxContainer);

import React, { Component } from "react";
import Rnd from "react-rnd";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  dragBox: {
    margin: "0px",
    backgroundColor: "transparent",
    border: "2px coral solid",
    borderStyle: "ridge"
  },
});


class DragBox extends Component {

  render(){
    return (
      <Rnd 
        id="dragBox"
        key={this.props.name}
        className={this.props.dragBox}

        size={ this.props.size }
      	position={ this.props.position }

        maxWidth={900}
        maxHeight={650}
        bounds="parent"
        style={{pointerEvents: this.props.disabledMouse ? 'none' : 'auto'}}

        onDragStop={this.props.onDragStop}
        onResize={this.props.onResize}
			/>
    )
  }
}


class DragBoxContainer extends Component {

  constructor(props){
    super(props);

    this.state = {
      boxCounter: 0,
      drawDragBox: this.props.drawDragBox || false,
      disabledMouse: !this.props.drawDragBox || false,
      showControls: false,
    }

    this.resetDragBox = this.resetDragBox.bind(this);
    this.drawDragBox = this.drawDragBox.bind(this);
    this.createDragBox = this.createDragBox.bind(this);
    this.removeDragBox = this.removeDragBox.bind(this);
  }

  resetDragBox = async (e) => {
    e.preventDefault();

    if (this.state.disableDraw){
      return;
    }

    const videoElement = document.getElementById("video");
    if (videoElement){
      this.setState( { showControls: videoElement.controls });
      videoElement.controls = false;
    }

    let video = e.target;
    let dim = video.getBoundingClientRect();
    let x = e.clientX - dim.left;
    let y = e.clientY - dim.top;

    this.setState({
      drawDragBox: true,
      boxCounter: this.state.boxCounter + 1,
      dragBoxX: x,
      dragBoxY: y,
      dragBoxWidth: 0,
      dragBoxHeight: 0,
      mouseDown: true,
      disabledMouse: true,
      disableDraw: false,
    }, 
    () => {
      this.props.onResize && this.props.onResize(e, 
        null, 
        {style: {width: 0, height: 0}},
        null,
        {x: this.state.dragBoxX, y: this.state.dragBoxY}
      );
    });
  }

  drawDragBox = (e) => {
    e.preventDefault();

    if (this.state.mouseDown){
      let video = e.target;
      let dim = video.getBoundingClientRect();
      let x = e.clientX - dim.left;
      let y = e.clientY - dim.top;

      let newWidth = x - this.state.dragBoxX;
      let newHeight = y - this.state.dragBoxY;

      // Passing direction and delta to onResize as null,
      // if necessary can be added in later
      this.props.onResize && this.props.onResize(e, 
      	null, 
      	{style: {width: newWidth, height: newHeight}},
      	null,
      	{x: this.state.dragBoxX, y: this.state.dragBoxY}
      );

      this.setState({
        boxCounter: this.state.boxCounter + 1,
        dragBoxWidth: newWidth,
        dragBoxHeight: newHeight,
      });
    }
  }

  createDragBox = (e) => {
    e.preventDefault();

    if (this.state.disableDraw){
      return;
    }

    let boxLargeEnough = this.state.dragBoxWidth > 25 
      && this.state.dragBoxHeight > 25;

    this.setState({
      mouseDown: false,
      disabledMouse: false,
      drawDragBox: boxLargeEnough,
    });
    
    const videoElement = document.getElementById("video");

    setTimeout(() => {
      if (videoElement){
        videoElement.controls = this.state.showControls;
      }
    }, 100);
  }

  removeDragBox = (e) => {
    e.preventDefault();
    this.setState({
      drawDragBox: false,
    });
    this.props.toggleDragBox && this.props.toggleDragBox();
  }

  render(){
    return (
      <div
        className={this.props.className}
      >
        <div 
          className={this.props.className}
          onMouseDown={(e) => this.resetDragBox(e)}
          onMouseMove={(e) => this.drawDragBox(e)}
          onMouseUp={(e) => this.createDragBox(e)}
          onPlay={(e) => { this.setState({ disableDraw: true }); this.removeDragBox(e)}}
          onPause={(e) => this.setState({ disableDraw: false })}>
          {this.props.children}
        </div>
        {this.state.drawDragBox || this.props.drawDragBox ?
        <DragBox 
          name={this.state.boxCounter}
          size={this.props.size}
          position={this.props.position}
          dragBox={this.props.dragBox}
          disabledMouse={this.state.disabledMouse}

          onResize={this.props.onResize}
          onDragStop={this.props.onDragStop}
        ></DragBox>
        : <div/>}
      </div>
    )
  }
}

export default withStyles(styles)(DragBoxContainer);


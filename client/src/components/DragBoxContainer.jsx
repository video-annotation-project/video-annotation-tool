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
        className={ this.props.dragBox }
        default={{
          x: this.props.x,
          y: this.props.y,
          width: this.props.width,
          height: this.props.height,
        }}
        maxWidth={900}
        maxHeight={650}
        bounds="parent"
        style={{pointerEvents: this.props.disabledMouse ? 'none' : 'auto'}}

        onDragStop={this.props.onDragStop}
        onResize={this.props.onResize}
      >
      </Rnd>
    )
  }
}


class DragBoxContainer extends Component {

  constructor(props){
    super(props);

    this.state = {
      boxCounter: 0,
      dragBoxX: this.props.x || 0,
      dragBoxY: this.props.y || 0,
      dragBoxWidth: this.props.width || 0,
      dragBoxHeight: this.props.height || 0,
      drawDragBox: this.props.drawDragBox || false,
      disabledMouse: !this.props.drawDragBox || false,
    }

    this.resetDragBox = this.resetDragBox.bind(this);
    this.drawDragBox = this.drawDragBox.bind(this);
    this.createDragBox = this.createDragBox.bind(this);
    this.removeDragBox = this.removeDragBox.bind(this);
  }

  resetDragBox = (e) => {
    e.preventDefault();
    var video = e.target;
    var dim = video.getBoundingClientRect();
    var x = e.clientX - dim.left;
    var y = e.clientY - dim.top;

    this.props.onDragStop && this.props.onDragStop(e, 
    	{x: x, y: y});
    
    this.setState({
      drawDragBox: true,
      boxCounter: this.state.boxCounter + 1,
      dragBoxX: x,
      dragBoxY: y,
      dragBoxWidth: 0,
      dragBoxHeight: 0,
      mouseDown: true,
      disabledMouse: true,
    });
  }

  drawDragBox = (e) => {
    e.preventDefault();
    if (this.state.mouseDown){
      var video = e.target;
      var dim = video.getBoundingClientRect();
      var x = e.clientX - dim.left;
      var y = e.clientY - dim.top;

      var newWidth = x - this.state.dragBoxX;
      var newHeight = y - this.state.dragBoxY;

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

    var boxLargeEnough = this.state.dragBoxWidth > 25 
      && this.state.dragBoxHeight > 25;

    this.setState({
      mouseDown: false,
      disabledMouse: false,
      drawDragBox: boxLargeEnough,
    });
  }

  removeDragBox = (e) => {
    this.setState({
      drawDragBox: false,
    });
  }

  render(){
    return (
      <div>
        <div 
          className={this.props.className}
          onMouseDown={(e) => this.resetDragBox(e)}
          onMouseMove={(e) => this.drawDragBox(e)}
          onMouseUp={(e) => this.createDragBox(e)}
          onPlay={(e) => this.removeDragBox()}>
          {this.props.children}
        </div>
        {this.state.drawDragBox ?
        <DragBox 
          name={this.state.boxCounter}
          x={this.state.dragBoxX} 
          y={this.state.dragBoxY}
          width={this.state.dragBoxWidth}
          height={this.state.dragBoxHeight}
          dragBox={this.props.dragBox}
          disabledMouse={this.state.disabledMouse}

          onResize={this.props.onResize}
          onDragStop={this.props.onDragStop}
        ></DragBox>
        : <div></div>}
      </div>
    )
  }
}

export default withStyles(styles)(DragBoxContainer);


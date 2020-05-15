// eslint-disable-next-line max-classes-per-file
import React, { Component } from 'react';
import Swal from 'sweetalert2/src/sweetalert2';
import HighlightOff from '@material-ui/icons/HighlightOff';
import CreateIcon from '@material-ui/icons/Create';


class Hover extends Component {
  constructor(props) {
    super(props);
    this.state = { hover: false };
  }

  render() {
    const { box, annotation, handleDelete, color, handleEdit, clicked } = this.props;
    const { hover } = this.state;
    let col = color;
    if (hover) {
      col = '2px solid red';
    }
    return (
      // eslint-disable-next-line
      <div
        style={{
          width: (box.x2 - box.x1) * (annotation.videowidth / box.videowidth),
          height:
            (box.y2 - box.y1) * (annotation.videoheight / box.videoheight),
          border: col
        }}
        onMouseEnter={() => this.setState({ hover: true })}
        onMouseLeave={() => this.setState({ hover: false })}
        
      >
        {hover ? (
          <div>
            <HighlightOff 
              onClick={event => {
                event.stopPropagation();
                Swal.fire({
                  title: 'Are you sure?',
                  text: "You won't be able to revert this!",
                  type: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#3085d6',
                  cancelButtonColor: '#d33',
                  confirmButtonText: 'Yes, delete it!'
                }).then(result => {
                  if (result.value) {
                    handleDelete(box);
                  }
                });
              }}
            />
            <CreateIcon
              onClick={
                event => {
                  handleEdit(!clicked, box.id, box);
                  // console.log(annotation)
                  // console.log(box)
                }
              }
            />
            <div>{box.name ? box.name : ''}</div>
          </div>
        ) : (
          ''
        )}
      </div>
    );
  }
}

class Boxes extends Component {

  state = {editClicked: false, prevClicker:null}

  handleEditButton = (clicked, id, box) => {
    const {handleConceptChange} = this.props;
    if(id !== this.state.prevClicker && this.state.prevClicker !== null) {
      return;
    }
    if(clicked) { // button has been clicked.
      // do stuff when edit button is clicked
      this.setState({prevClicker:id})
    } else { // button has been reclicked to false: reset button clicking state
      this.setState({prevClicker:null})
    }
    this.setState({editClicked: clicked})
    handleConceptChange(id, box)
  };

  displayIgnoredBoxes = () => {
    const { ignoredAnnotations, annotation, handleDelete } = this.props;
    return (
      <div>
        {ignoredAnnotations
          ? ignoredAnnotations.map(box => (
              <div
                key={box.id}
                style={{
                  position: 'relative',
                  width: 0,
                  height: 0,
                  top: box.y1 * (annotation.videoheight / box.videoheight),
                  left: box.x1 * (annotation.videowidth / box.videowidth)
                }}
              >
                <Hover
                  id={box.id}
                  handleDelete={handleDelete}
                  box={box}
                  annotation={annotation}
                  color="2px solid DodgerBlue"
                  handleEdit={this.handleEditButton}
                  clicked={this.state.editClicked}
                />
              </div>
            ))
          : ' '}
      </div>
    );
  };

  displayOutsideBoxes = () => {
    const { annotation, boxesOutsideCol, handleDelete } = this.props;
    return (
      <div>
        {boxesOutsideCol
          ? boxesOutsideCol.map(box => (
              <div
                key={box.id}
                style={{
                  position: 'relative',
                  width: 0,
                  height: 0,
                  top: box.y1 * (annotation.videoheight / box.videoheight),
                  left: box.x1 * (annotation.videowidth / box.videowidth)
                }}
              >
                <Hover
                  id={box.id}
                  concept={box.concept}
                  handleDelete={handleDelete}
                  box={box}
                  annotation={annotation}
                  color="2px solid DodgerBlue"
                  handleEdit={this.handleEditButton}
                  clicked={this.state.editClicked}
                />
              </div>
            ))
          : ' '}
      </div>
    );
  };

  displayVerifiedBoxes = () => {
    const { annotation, verifiedBoxes, handleDelete } = this.props;
    return (
      <div>
        {verifiedBoxes
          ? verifiedBoxes.map(box => (
              <div
                key={box.id}
                style={{
                  position: 'relative',
                  width: 0,
                  height: 0,
                  top: box.y1 * (annotation.videoheight / box.videoheight),
                  left: box.x1 * (annotation.videowidth / box.videowidth)
                }}
              >
                <Hover
                  id={box.id}
                  concept={box.concept}
                  handleDelete={handleDelete}
                  box={box}
                  annotation={annotation}
                  color="2px solid lightgreen"
                  handleEdit={this.handleEditButton}
                  clicked={this.state.editClicked}
                />
              </div>
            ))
          : ' '}
      </div>
    );
  };

  render() {
    return (
      <div>
        {this.displayOutsideBoxes()}
        {this.displayIgnoredBoxes()}
        {this.displayVerifiedBoxes()}
      </div>
    );
  }
}

export default Boxes;

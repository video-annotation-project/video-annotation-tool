// eslint-disable-next-line max-classes-per-file
import React, { Component } from 'react';
import Swal from 'sweetalert2/src/sweetalert2';
import HighlightOff from '@material-ui/icons/HighlightOff';

class Hover extends Component {
  constructor(props) {
    super(props);
    this.state = { hover: false };
  }

  render() {
    const { box, annotation, handleDelete, type, color } = this.props;
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
              handleDelete(type, box.id);
            }
          });
        }}
      >
        {hover ? (
          <div>
            <HighlightOff />
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
                  type="ignored"
                  box={box}
                  annotation={annotation}
                  color={
                    box.admin === null
                      ? '2px solid Yellow'
                      : '2px solid DodgerBlue'
                  }
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
                  type="outside"
                  box={box}
                  annotation={annotation}
                  color={
                    box.admin === null
                      ? '2px solid Yellow'
                      : '2px solid DodgerBlue'
                  }
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
                  type="verified"
                  box={box}
                  annotation={annotation}
                  color="2px solid lightgreen"
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

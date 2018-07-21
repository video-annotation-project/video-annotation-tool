import React from 'react';

class CurrentConcepts extends React.Component {
   render() {
      var concepts = ['concept1', 'concept2', 'concept3', 'concept4', 'concept5', 'concept6', 'concept7', 'concept8', 'concept9', 'concept10', 'concept11', 'concept12', 'concept13', 'concept14', 'concept15', 'concept16', 'concept17', 'concept18', 'concept19', 'concept20'];
      var conceptsList = concepts.map(function(name){return <li className = "conceptListElement">{name} <br /> <img src = "./none.png" alt = "Could not be downloaded" height="100" width="100" /></li>})
      var leftList = [];
      var rightList = [];
      var conceptsListLength = conceptsList.length;
      for (var i = 0; i < conceptsListLength; i++)
      {
         if ((i % 2) === 1)
         {
            rightList.push(conceptsList[i]);
         }
         else
         {
            leftList.push(conceptsList[i]);
         }

      }
      return (
                <div>
                   <div id = "leftConcepts">
                      <ul>{ leftList }</ul>
                   </div>
                   <div id = "rightConcepts">
                      <ul>{ rightList }</ul>
                   </div>
                </div>
             );
   }

}

export default (CurrentConcepts);

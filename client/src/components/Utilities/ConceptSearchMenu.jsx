import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Downshift from 'downshift';
import TextField from '@material-ui/core/TextField';
import Paper from '@material-ui/core/Paper';
import MenuItem from '@material-ui/core/MenuItem';

const styles = theme => ({
  input: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2)
  }
});

const ConceptSearchMenu = props => {
  const { classes, handleKeyUp, searchConcepts } = props;
  function itemToString(item) {
    if (item == null) {
      return '';
    }
    return item.name;
  }

  function renderInput(inputProps) {
    const { InputProps, ref, ...other } = inputProps;

    return (
      <TextField
        autoFocus
        InputProps={{
          inputRef: ref,
          ...InputProps
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...other}
      />
    );
  }

  function renderSuggestion(suggestionProps) {
    const { suggestion, index, itemProps, highlightedIndex } = suggestionProps;
    const isHighlighted = highlightedIndex === index;
    return (
      <MenuItem
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...itemProps}
        key={suggestion.id}
        selected={isHighlighted}
        component="div"
      >
        {suggestion.name}
      </MenuItem>
    );
  }

  return (
    <Downshift
      className={classes.input}
      autoFocus
      margin="dense"
      id="concept"
      type="text"
      itemToString={itemToString}
    >
      {({
        clearSelection,
        getInputProps,
        getItemProps,
        getLabelProps,
        getMenuProps,
        highlightedIndex,
        inputValue,
        isOpen,
        openMenu
      }) => {
        const { onBlur, onChange, onFocus, ...inputProps } = getInputProps({
          onChange: event => {
            if (event.target.value === '') {
              clearSelection();
            }
          },
          onKeyUp: handleKeyUp,
          onFocus: openMenu,
          placeholder: 'Search for concept here',
          spellCheck: false
        });

        return (
          <div className={classes.input}>
            {renderInput({
              fullWidth: true,
              label: 'Concept name',
              InputLabelProps: getLabelProps({ shrink: true }),
              InputProps: { onBlur, onChange, onFocus },
              inputProps
            })}

            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <div {...getMenuProps()}>
              {isOpen ? (
                <Paper square>
                  {searchConcepts(inputValue).map((suggestion, index) =>
                    renderSuggestion({
                      suggestion,
                      index,
                      itemProps: getItemProps({
                        item: suggestion
                      }),
                      highlightedIndex
                    })
                  )}
                </Paper>
              ) : null}
            </div>
          </div>
        );
      }}
    </Downshift>
  );
};

export default withStyles(styles)(ConceptSearchMenu);

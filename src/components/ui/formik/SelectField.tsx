import * as React from 'react';
import { useField } from 'formik';
import { FormGroup, FormSelect, FormSelectOption } from '@patternfly/react-core';
import { getFieldId } from './utils';
import { SelectFieldProps } from './types';
import HelpTooltip from './HelpTooltip';

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  helperText,
  isRequired,
  onChange,
  ...props
}) => {
  const [field, { touched, error }] = useField(props.name);
  const fieldId = getFieldId(props.name, 'input');
  const isValid = !(touched && error);
  const errorMessage = !isValid ? error : '';
  return (
    <FormGroup
      fieldId={fieldId}
      label={label}
      helperTextInvalid={errorMessage}
      isValid={isValid}
      isRequired={isRequired}
    >
      <HelpTooltip helperText={helperText} />
      <FormSelect
        {...field}
        {...props}
        id={fieldId}
        isValid={isValid}
        isRequired={isRequired}
        aria-describedby={`${fieldId}-helper`}
        onChange={(value, event) => {
          field.onChange(event);
          onChange && onChange(event);
        }}
      >
        {options.map((option, index) => (
          <FormSelectOption key={index} {...option} />
        ))}
      </FormSelect>
    </FormGroup>
  );
};

export default SelectField;

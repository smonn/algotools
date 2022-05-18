import { FC, FormEventHandler, useCallback, useId } from "react";

export type SelectProps = {
  label: string;
  name: string;
  error?: string;
  options: ([string, string] | string)[];
  onSelect?: (value: string) => void;
  defaultValue?: string;
  helpText?: string | undefined;
};

export const Select: FC<SelectProps> = ({
  label,
  name,
  error,
  options,
  onSelect,
  defaultValue,
  helpText,
}) => {
  const id = useId();

  const onInput = useCallback<FormEventHandler<HTMLSelectElement>>(
    (event) => {
      onSelect && onSelect(event.currentTarget.value);
    },
    [onSelect]
  );

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <select id={id} name={name} onInput={onInput} defaultValue={defaultValue}>
        {options.map((option) => (
          <option
            key={String(option)}
            value={typeof option === "string" ? option : option[1]}
          >
            {typeof option === "string" ? option : option[0]}
          </option>
        ))}
      </select>
      {helpText ? <span className="help-text">{helpText}</span> : null}
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
};

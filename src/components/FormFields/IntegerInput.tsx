import { FC, FormEventHandler, useCallback, useId } from "react";

export type IntegerInputProps = {
  label: string;
  name: string;
  error?: string;
  onInteger?: (integer: number) => void;
  min?: number;
  max?: number;
  helpText?: string | undefined;
};

export const IntegerInput: FC<IntegerInputProps> = ({
  name,
  label,
  error,
  min,
  max,
  onInteger,
  helpText,
}) => {
  const id = useId();

  const onInput = useCallback<FormEventHandler<HTMLInputElement>>(
    (event) => {
      const integer = Number.parseInt(event.currentTarget.value, 10);
      onInteger && onInteger(integer);
    },
    [onInteger]
  );

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        type="number"
        defaultValue={0}
        step={1}
        min={min}
        max={max}
        id={id}
        name={name}
        onInput={onInput}
      />
      {helpText ? <span className="help-text">{helpText}</span> : null}
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
};

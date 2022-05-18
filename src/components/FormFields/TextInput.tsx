import { FC, FormEventHandler, useCallback, useId } from "react";

export type TextInputProps = {
  label: string;
  name: string;
  helpText?: string | undefined;
  error?: string;
  onText?: (text: string) => void;
  defaultValue?: string;
};

export const TextInput: FC<TextInputProps> = ({
  name,
  label,
  error,
  defaultValue,
  helpText,
  onText,
}) => {
  const id = useId();

  const onInput = useCallback<FormEventHandler<HTMLInputElement>>(
    (event) => {
      onText && onText(event.currentTarget.value);
    },
    [onText]
  );

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        type="text"
        defaultValue={defaultValue}
        id={id}
        name={name}
        onInput={onInput}
      />
      {helpText ? <span className="help-text">{helpText}</span> : null}
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
};

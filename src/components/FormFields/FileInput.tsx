import { FC, FormEventHandler, useCallback, useId } from "react";

export type FileInputProps = {
  label: string;
  name: string;
  accept?: string;
  error?: string;
  multiple?: boolean;
  onFiles?: (files: File[]) => void;
  onFile?: (file: File | undefined) => void;
  helpText?: string | undefined;
};

export const FileInput: FC<FileInputProps> = ({
  name,
  label,
  accept,
  error,
  multiple = false,
  onFiles,
  onFile,
  helpText,
}) => {
  const id = useId();

  const onInput = useCallback<FormEventHandler<HTMLInputElement>>(
    (event) => {
      const files = event.currentTarget.files
        ? [...event.currentTarget.files]
        : [];

      onFiles && onFiles(files);
      onFile && onFile(files[0]);
    },
    [onFiles, onFile]
  );

  return (
    <label htmlFor={id}>
      <span>{label}</span>
      <input
        type="file"
        id={id}
        name={name}
        accept={accept}
        onInput={onInput}
        multiple={multiple}
      />
      {helpText ? <span className="help-text">{helpText}</span> : null}
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
};

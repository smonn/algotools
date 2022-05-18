import { FC, FormEventHandler, useCallback, useId } from "react";

export type FileInputProps = {
  label: string;
  name: string;
  accept?: string;
  error?: string;
  onFiles?: (files: File[]) => void;
  onFile?: (file: File | undefined) => void;
};

export const FileInput: FC<FileInputProps> = ({
  name,
  label,
  accept,
  error,
  onFiles,
  onFile,
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
      />
      {error ? <span className="error">{error}</span> : null}
    </label>
  );
};

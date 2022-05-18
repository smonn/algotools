import { object, min, integer, Infer, string } from "superstruct";

export const StateSchema = object({
  numByteSlices: min(integer(), 0),
  numInts: min(integer(), 0),
});

export type StateSchema = Infer<typeof StateSchema>;

export function isFile(
  formValue: FormDataEntryValue | null
): formValue is File {
  return formValue instanceof File;
}

export function isInteger(formValue: number): formValue is number {
  return (
    !isNaN(formValue) &&
    isFinite(formValue) &&
    Math.floor(formValue) === formValue
  );
}

export const CreateSmartContract = object({
  approvalSource: string(),
  clearStateSource: string(),
  globalState: StateSchema,
  localState: StateSchema,
  extraPages: min(integer(), 0),
});

export type CreateSmartContract = Infer<typeof CreateSmartContract>;

export function toInteger(formValue: FormDataEntryValue | null): number {
  if (formValue === null) return NaN;
  if (typeof formValue !== "string") return NaN;
  return Number.parseInt(formValue, 10);
}

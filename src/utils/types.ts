export type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]> | undefined;
    }
  : T;

export type TextFile = {
  name: string;
  lastModified: number;
  size: number;
  content: string;
};

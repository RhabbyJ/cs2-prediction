export type SeriesState = {
  id: string;
  series?: {
    id: string;
  } | null;
  title?: {
    id: string;
    nameShortened?: string | null;
  } | null;
};

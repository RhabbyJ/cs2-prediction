export type SeriesParticipant = {
  scoreAdvantage?: number | null;
  team?: {
    id: string;
    name: string;
    nameShortened?: string | null;
  } | null;
};

export type Series = {
  id: string;
  startTimeScheduled?: string | null;
  format?: {
    id: string;
    name: string;
  } | null;
  title?: {
    id: string;
    name: string;
    nameShortened?: string | null;
  } | null;
  tournament?: {
    id: string;
    name: string;
    nameShortened?: string | null;
  } | null;
  participants?: SeriesParticipant[] | null;
};

export type Series = {
  id: string;
  startTimeScheduled?: string | null;
  format?: {
    name: string;
    nameShortened?: string | null;
  } | null;
  title?: {
    nameShortened?: string | null;
  } | null;
  tournament?: {
    nameShortened?: string | null;
  } | null;
  teams?: Array<{
    baseInfo?: {
      name?: string | null;
    } | null;
    scoreAdvantage?: number | null;
  }> | null;
};

export const getSeriesQuery = `
  query GetSeries($id: ID!) {
    series(id: $id) {
      id
      startTimeScheduled
      title {
        nameShortened
      }
      tournament {
        nameShortened
      }
      format {
        name
        nameShortened
      }
      teams {
        baseInfo {
          name
        }
        scoreAdvantage
      }
    }
  }
`;

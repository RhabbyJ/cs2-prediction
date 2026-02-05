export const getSeriesQuery = `
  query GetSeries($id: ID!) {
    series(id: $id) {
      id
      startTimeScheduled
      format {
        id
        name
      }
      title {
        id
        name
        nameShortened
      }
      tournament {
        id
        name
        nameShortened
      }
      participants {
        scoreAdvantage
        team {
          id
          name
          nameShortened
        }
      }
    }
  }
`;

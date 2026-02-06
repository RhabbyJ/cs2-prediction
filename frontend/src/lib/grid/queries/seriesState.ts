export const getSeriesStateCDFQuery = `
  query GetSeriesState($id: ID!) {
    series(id: $id) {
      id
      startTimeScheduled
      format {
        name
      }
    }
  }
`;

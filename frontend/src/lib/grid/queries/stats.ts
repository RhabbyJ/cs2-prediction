export const getSeriesStatsCDFQuery = `
  query GetSeriesStats($id: ID!) {
    series(id: $id) {
      id
      startTimeScheduled
    }
  }
`;

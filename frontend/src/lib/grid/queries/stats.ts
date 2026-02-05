export const getSeriesStatsQuery = `
  query GetSeriesStats($id: ID!) {
    seriesStats(id: $id) {
      id
      series {
        id
      }
    }
  }
`;

export const getSeriesStateQuery = `
  query GetSeriesState($id: ID!) {
    seriesState(id: $id) {
      id
      series {
        id
      }
      title {
        id
        nameShortened
      }
    }
  }
`;

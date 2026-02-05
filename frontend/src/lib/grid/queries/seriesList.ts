export const getAllSeriesNext24hQuery = `
  query GetAllSeriesInNext24Hours($start: String!, $end: String!) {
    allSeries(
      filter: {
        startTimeScheduled: {
          gte: $start
          lte: $end
        }
      }
      orderBy: StartTimeScheduled
    ) {
      totalCount
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          title {
            nameShortened
          }
          tournament {
            nameShortened
          }
          startTimeScheduled
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
    }
  }
`;

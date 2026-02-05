export const getTournamentQuery = `
  query GetTournament($id: ID!) {
    tournament(id: $id) {
      id
      name
      nameShortened
    }
  }
`;

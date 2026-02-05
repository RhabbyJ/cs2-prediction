export const getTeamQuery = `
  query GetTeam($id: ID!) {
    team(id: $id) {
      id
      name
      nameShortened
    }
  }
`;

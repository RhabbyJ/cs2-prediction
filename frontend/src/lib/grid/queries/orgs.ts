export const getOrganizationQuery = `
  query GetEsportsOrganization($id: ID!) {
    organization(id: $id) {
      id
      name
    }
  }
`;

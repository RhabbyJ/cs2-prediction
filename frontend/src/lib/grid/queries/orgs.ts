export const getEsportsOrganizationQuery = `
  query GetEsportsOrganization($id: ID!) {
    organization(id: $id) {
      id
      name
      nameShortened
    }
  }
`;

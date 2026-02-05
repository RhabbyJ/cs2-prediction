export const getEsportsOrganizationQuery = `
  query GetEsportsOrganization($id: ID!) {
    esportsOrganization(id: $id) {
      id
      name
      nameShortened
    }
  }
`;

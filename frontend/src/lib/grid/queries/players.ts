export const getPersonQuery = `
  query GetPerson($id: ID!) {
    person(id: $id) {
      id
    }
  }
`;

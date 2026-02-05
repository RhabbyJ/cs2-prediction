export const getPlayerQuery = `
  query GetPlayer($id: ID!) {
    player(id: $id) {
      id
      name
      nickName
    }
  }
`;

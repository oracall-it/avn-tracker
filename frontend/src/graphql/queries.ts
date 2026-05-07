import { gql } from '@apollo/client'

export const GAME_FIELDS = gql`
  fragment GameFields on Game {
    id title developer coverUrl status devStatus
    myVersion latestVersion downloadUrl tags notes description
    vndbId hasUpdate addedAt updatedAt
  }
`

export const GET_GAMES = gql`
  ${GAME_FIELDS}
  query GetGames($filter: GameFilter) {
    games(filter: $filter) { ...GameFields }
  }
`

export const GET_GAME = gql`
  ${GAME_FIELDS}
  query GetGame($id: ID!) {
    game(id: $id) { ...GameFields }
  }
`

export const SEARCH_VNDB = gql`
  query SearchVNDB($query: String!, $page: Int, $adultsOnly: Boolean) {
    searchVNDB(query: $query, page: $page, adultsOnly: $adultsOnly) {
      results { vndbId title developer coverUrl tags description }
      count
      more
    }
  }
`

export const GET_VNDB_GAME = gql`
  query GetVNDBGame($vndbId: String!) {
    getVNDBGame(vndbId: $vndbId) {
      vndbId title developer coverUrl tags description
      screenshots { thumbnail url }
    }
  }
`

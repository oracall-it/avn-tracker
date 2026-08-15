import { gql } from '@apollo/client'

export const GAME_FIELDS = gql`
  fragment GameFields on Game {
    id title developer coverUrl status devStatus
    myVersion latestVersion downloadUrl tags notes description
    vndbId f95Id hasUpdate addedAt updatedAt
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

export const SEARCH_F95 = gql`
  query SearchF95($query: String!, $page: Int) {
    searchF95(query: $query, page: $page) {
      results { threadId threadUrl title version engine tags }
      totalPages
    }
  }
`

export const GET_F95_GAME = gql`
  query GetF95Game($threadUrl: String!) {
    getF95Game(threadUrl: $threadUrl) {
      threadId threadUrl title developer version coverUrl description tags engine f95Status screenshots
    }
  }
`

export const GET_APP_SETTINGS = gql`
  query AppSettings {
    appSettings { f95Username f95Connected }
  }
`

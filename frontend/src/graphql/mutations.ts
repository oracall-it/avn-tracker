import { gql } from '@apollo/client'
import { GAME_FIELDS } from './queries'

export const ADD_GAME = gql`
  ${GAME_FIELDS}
  mutation AddGame($input: GameInput!) {
    addGame(input: $input) { ...GameFields }
  }
`

export const UPDATE_GAME = gql`
  ${GAME_FIELDS}
  mutation UpdateGame($id: ID!, $input: GameInput!) {
    updateGame(id: $id, input: $input) { ...GameFields }
  }
`

export const DELETE_GAME = gql`
  mutation DeleteGame($id: ID!) {
    deleteGame(id: $id)
  }
`

export const IMPORT_FROM_VNDB = gql`
  ${GAME_FIELDS}
  mutation ImportFromVNDB($vndbId: String!) {
    importFromVNDB(vndbId: $vndbId) { ...GameFields }
  }
`

export const SYNC_LATEST_VERSION = gql`
  ${GAME_FIELDS}
  mutation SyncLatestVersion($id: ID!) {
    syncLatestVersion(id: $id) { ...GameFields }
  }
`

export const EXPORT_LIBRARY = gql`
  mutation ExportLibrary {
    exportLibrary
  }
`

export const IMPORT_LIBRARY = gql`
  mutation ImportLibrary($json: String!) {
    importLibrary(json: $json)
  }
`

export const IMPORT_FROM_F95 = gql`
  ${GAME_FIELDS}
  mutation ImportFromF95($threadUrl: String!) {
    importFromF95(threadUrl: $threadUrl) { ...GameFields }
  }
`

export const SYNC_F95_VERSION = gql`
  ${GAME_FIELDS}
  mutation SyncF95Version($id: ID!) {
    syncF95Version(id: $id) { ...GameFields }
  }
`

export const SET_F95_CREDENTIALS = gql`
  mutation SetF95Credentials($username: String!, $password: String!) {
    setF95Credentials(username: $username, password: $password)
  }
`

export const TEST_F95_CONNECTION = gql`
  mutation TestF95Connection {
    testF95Connection
  }
`

export const SYNC_ALL_F95_VERSIONS = gql`
  mutation SyncAllF95Versions {
    syncAllF95Versions {
      total
      updated
      errors
    }
  }
`

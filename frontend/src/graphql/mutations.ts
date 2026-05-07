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

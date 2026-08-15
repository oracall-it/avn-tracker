import { APIRequestContext } from '@playwright/test'

const GQL_URL = process.env.API_URL ?? 'http://localhost:8080/graphql'

export async function gql(request: APIRequestContext, query: string, variables?: Record<string, unknown>) {
  const resp = await request.post(GQL_URL, {
    data: { query, variables },
    headers: { 'Content-Type': 'application/json' },
  })
  const body = await resp.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return body.data
}

export async function createTestGame(request: APIRequestContext, overrides: Record<string, unknown> = {}) {
  const data = await gql(request, `
    mutation AddGame($input: GameInput!) {
      addGame(input: $input) { id title status myVersion latestVersion }
    }
  `, {
    input: {
      title: `[E2E] Test Game ${Date.now()}`,
      developer: 'E2E Studio',
      status: 'WANT',
      devStatus: 'ONGOING',
      myVersion: '0.9.0',
      latestVersion: '1.0.0',
      tags: ['Romance', 'Comedy'],
      notes: 'Created by Playwright test',
      ...overrides,
    },
  })
  return data.addGame as { id: string; title: string }
}

export async function deleteTestGame(request: APIRequestContext, id: string) {
  await gql(request, `mutation { deleteGame(id: "${id}") }`)
}

export async function cleanupE2EGames(request: APIRequestContext) {
  const data = await gql(request, `{ games { id title } }`)
  const games: { id: string; title: string }[] = data.games
  await Promise.all(
    games.filter(g => g.title.startsWith('[E2E]')).map(g => deleteTestGame(request, g.id))
  )
}

export async function createTestLink(request: APIRequestContext, title = '[E2E] Test Link', url = 'https://example.com') {
  const data = await gql(request, `
    mutation AddRecommendationLink($url: String!, $title: String!) {
      addRecommendationLink(url: $url, title: $title) { id url title }
    }
  `, { url, title })
  return data.addRecommendationLink as { id: string; url: string; title: string }
}

export async function cleanupE2ELinks(request: APIRequestContext) {
  const data = await gql(request, `{ recommendationLinks { id title } }`)
  const links: { id: string; title: string }[] = data.recommendationLinks
  await Promise.all(
    links
      .filter(l => l.title.startsWith('[E2E]'))
      .map(l => gql(request, `mutation { deleteRecommendationLink(id: "${l.id}") }`))
  )
}

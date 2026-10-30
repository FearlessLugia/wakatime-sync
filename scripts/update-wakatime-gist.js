const { GIST_ID, GH_TOKEN, WAKATIME_API_KEY } = process.env

const API_URL = 'https://wakatime.com/api/v1/users/current/summaries'
const GITHUB_API_URL = 'https://api.github.com'

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getWakaTimeHeaders(token) {
  return token.startsWith('waka_tok_')
    ? { Authorization: `Bearer ${token}` }
    : {}
}

async function getYesterdaySummary(token, date) {
  const url = new URL(API_URL)
  url.searchParams.set('start', date)
  url.searchParams.set('end', date)
  if (!token.startsWith('waka_tok_')) {
    url.searchParams.set('api_key', token)
  }

  const response = await fetch(url, {
    headers: getWakaTimeHeaders(token),
  })
  if (!response.ok) {
    throw new Error(
      `WakaTime request failed (${response.status}): ${await response.text()}`
    )
  }
  return response.json()
}

async function updateGist(gistId, token, date, summary) {
  const response = await fetch(`${GITHUB_API_URL}/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      files: {
        [`summaries_${date}.json`]: {
          content: JSON.stringify(summary),
        },
      },
    }),
  })
  if (!response.ok) {
    throw new Error(
      `GitHub Gist update failed (${response.status}): ${await response.text()}`
    )
  }
}

async function main() {
  const gistId = required('GIST_ID', GIST_ID)
  const githubToken = required('GH_TOKEN', GH_TOKEN)
  const wakatimeToken = required('WAKATIME_API_KEY', WAKATIME_API_KEY)
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const response = await getYesterdaySummary(wakatimeToken, date)
  await updateGist(gistId, githubToken, date, response.data)
  console.log(`Updated Gist with WakaTime summary for ${date}`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

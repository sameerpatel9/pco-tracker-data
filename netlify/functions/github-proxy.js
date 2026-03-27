const TOKEN = process.env.GH_TOKEN;
const OWNER = 'sameerpatel9';
const REPO  = 'pco-tracker-data';
const FILE  = 'pco-data.json';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;

const headers = {
  'Authorization': `token ${TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'pco-tracker'
};

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    // GET — load data
    if (event.httpMethod === 'GET') {
      const r = await fetch(API, { headers });

      if (r.status === 404) {
        // File doesn't exist yet — create it empty
        const empty = { pcos: [], users: [], userColorIdx: 0, pcoCounter: 1 };
        const content = Buffer.from(JSON.stringify(empty, null, 2)).toString('base64');
        const body = { message: 'Init PCO data', content };
        const w = await fetch(API, { method: 'PUT', headers, body: JSON.stringify(body) });
        const wj = await w.json();
        return {
          statusCode: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fresh: true, sha: wj.content.sha, data: empty })
        };
      }

      if (!r.ok) throw new Error('GitHub error ' + r.status);
      const j = await r.json();
      const raw = Buffer.from(j.content.replace(/\n/g, ''), 'base64').toString('utf8');
      const data = JSON.parse(raw);
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: j.sha, data })
      };
    }

    // POST — save data
    if (event.httpMethod === 'POST') {
      const { sha, data } = JSON.parse(event.body);
      const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
      const body = { message: `PCO update ${new Date().toISOString()}`, content };
      if (sha) body.sha = sha;
      const r = await fetch(API, { method: 'PUT', headers, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.status); }
      const j = await r.json();
      return {
        statusCode: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: j.content.sha })
      };
    }

    return { statusCode: 405, headers: cors, body: 'Method not allowed' };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};

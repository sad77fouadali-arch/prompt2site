// Client MCP OriginKit — connexion isolée en lecture seule.
// Ce module ne modifie pas le moteur de génération Prompt2Site.

const {
  Client,
  StreamableHTTPClientTransport
} = require('@modelcontextprotocol/client');

const ORIGINKIT_MCP_URL = 'https://mcp.originkit.dev/mcp';

function getOriginKitApiKey() {
  const apiKey = String(process.env.ORIGINKIT_API_KEY || '').trim();

  if (!apiKey) {
    throw new Error('ORIGINKIT_API_KEY absente');
  }

  return apiKey;
}

async function withOriginKitClient(callback) {
  const apiKey = getOriginKitApiKey();

  const client = new Client({
    name: 'prompt2site',
    version: '1.0.0'
  });

  const transport = new StreamableHTTPClientTransport(
    new URL(ORIGINKIT_MCP_URL),
    {
      authProvider: {
        token: async () => apiKey
      }
    }
  );

  await client.connect(transport);

  try {
    return await callback(client);
  } finally {
    await client.close();
  }
}

async function checkOriginKitConnection() {
  return withOriginKitClient(async (client) => {
    const response = await client.listTools();
    const tools = response.tools || [];

    return {
      connected: true,
      toolCount: tools.length,
      tools: tools.map((tool) => tool.name).sort()
    };
  });
}

module.exports = {
  checkOriginKitConnection
};

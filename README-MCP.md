# Portland OCDS MCP Server

Model Context Protocol (MCP) server for querying Portland's Open Contracting data with Claude.

## Available Tools

| Tool | Purpose |
|------|---------|
| `get_database_overview` | High-level stats: tender/contract counts, date range, total value |
| `get_tender_stats` | Aggregate counts by status (active, complete, terminated, etc.) |
| `search_tenders` | Search tenders by title, status, or value range |
| `get_tender_details` | Full OCDS record for a specific tender ID |
| `search_contracts` | Search contracts with vendor filtering |

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

### Local (stdio) Connection
```json
{
  "mcpServers": {
    "portland-ocds": {
      "command": "python3",
      "args": ["/Users/devin/Antigravity/OpenContracting/backend/mcp_server.py"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/tenders_db"
      }
    }
  }
}
```

### Remote Connection (via npx proxy)
```json
{
  "mcpServers": {
    "portland-ocds": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://portland-ocds.wegov.nyc/mcp/mcp"]
    }
  }
}
```

## Running Locally

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run MCP server (HTTP transport)
uvicorn serve_mcp:app --port 8082

# Or run with Docker
docker compose up mcp
```

## Verification

After restarting Claude Desktop, a 🔌 icon should appear. Ask Claude:

> "What's in the Portland contracting database?"

Claude will call `get_database_overview` and summarize the dataset.

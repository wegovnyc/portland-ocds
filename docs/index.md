---
layout: default
title: Portland OCDS Explorer
---

# Portland OCDS Explorer

AI-powered tools for exploring City of Portland open contracting data.

## Quick Links

- **[Claude Desktop Setup](./claude-desktop-setup)** - Connect Claude to Portland procurement data
- **[Live Explorer](https://portland-ocds.wegov.nyc)** - Browse tenders and contracts

## What is this?

The Portland OCDS Explorer provides tools to query and analyze the City of Portland's Open Contracting Data Standard (OCDS) dataset using AI.

### Features

- 🔍 **Search** - Find tenders and contracts by keyword, status, or value
- 📊 **Analytics** - Get aggregate statistics on procurement activity
- 💰 **Payment Tracking** - View transaction history and approval workflows
- 🤖 **AI-Powered** - Ask questions in natural language via Claude

## Connect Claude Desktop

Add this to your Claude Desktop config file:

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

Then ask Claude: *"What's in the Portland contracting database?"*

[Full setup instructions →](./claude-desktop-setup)

---

Built by [WeGov NYC](https://wegov.nyc) • [View on GitHub](https://github.com/wegovnyc/portland-ocds)

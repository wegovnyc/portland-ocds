---
layout: default
title: Claude Desktop Setup
---

# Claude Desktop Setup Guide

Connect Claude Desktop to the Portland OCDS Explorer for AI-powered procurement analysis.

## Quick Setup (2 minutes)

### Step 1: Find your config file

**Mac:**

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**

```
%APPDATA%\Claude\claude_desktop_config.json
```

> **Tip:** If the file doesn't exist, create it.

---

### Step 2: Add this configuration

Copy and paste this into the file:

```json
{
  "mcpServers": {
    "portland-ocds": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://portland-ocds.wegov.nyc/mcp/mcp"
      ]
    }
  }
}
```

Save the file.

---

### Step 3: Restart Claude Desktop

Completely quit Claude Desktop and reopen it.

---

### Step 4: Try it out!

Ask Claude things like:

- *"What's in the Portland contracting database?"*
- *"How many active tenders are there?"*
- *"Search for contracts related to snow removal"*
- *"Show me the tender with ID ocds-ptecst-133262"*

---

## Available Tools

### Statistics & Overview

| Tool | What it does |
| ---- | ------------ |
| `get_database_overview` | High-level stats: tender/contract counts, date range, total value |
| `get_tender_stats` | Aggregate counts by status (active, complete, etc.) |

### Search Tools

| Tool | What it does |
| ---- | ------------ |
| `search_tenders` | Search tenders by title, status, or value range |
| `search_contracts` | Search contracts with vendor filtering |
| `get_tender_details` | Full OCDS record for a specific tender ID |

---

## Data Available

The Portland OCDS dataset includes:

- **Tenders** - Procurement opportunities and solicitations
- **Contracts** - Awarded contracts with implementation data
- **Milestones** - Approval workflows (Contract Admin → Auditor → Attorney → Purchasing)
- **Transactions** - Payment records with payer/payee details
- **Purchase Orders** - PO identifiers and execution periods

---

## Troubleshooting

### "Could Not Load App Settings" error

Make sure your JSON is valid. Check for:
- Missing commas
- Unclosed brackets
- Extra trailing commas

### Connection timeout

The MCP server may take a few seconds to connect on first use. Try again after a moment.

### Tools not appearing

Completely quit Claude Desktop (not just close the window) and reopen it.

---

## Need Help?

- [Live Demo (portland-ocds.wegov.nyc)](https://portland-ocds.wegov.nyc)
- [GitHub Repository](https://github.com/wegovnyc/portland-ocds)
- [WeGov NYC](https://wegov.nyc)

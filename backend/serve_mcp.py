"""
Portland OCDS MCP Server - HTTP Transport Wrapper

ASGI application for serving the MCP server over Streamable HTTP.
Run with: uvicorn serve_mcp:app --port 8082

Includes OAuth 2.1 discovery endpoints for Claude Online compatibility.
"""

import json
import uuid
from contextlib import asynccontextmanager
from starlette.applications import Starlette
from starlette.routing import Route, Mount
from starlette.responses import JSONResponse
from mcp_server import mcp

# Server metadata
SERVER_NAME = "Portland OCDS MCP"
SERVER_URL = "https://portland-ocds.wegov.nyc"  # Update with actual deployment URL


@asynccontextmanager
async def lifespan(app):
    """Manage MCP session lifecycle for Streamable HTTP transport."""
    async with mcp.session_manager.run():
        yield


# OAuth 2.1 Discovery Endpoints (required for Claude Online)
# These implement a passthrough auth flow for unauthenticated access

async def oauth_protected_resource(request):
    """/.well-known/oauth-protected-resource discovery endpoint."""
    return JSONResponse({
        "resource": SERVER_URL,
        "authorization_servers": [SERVER_URL]
    })


async def oauth_authorization_server(request):
    """/.well-known/oauth-authorization-server metadata endpoint."""
    return JSONResponse({
        "issuer": SERVER_URL,
        "authorization_endpoint": f"{SERVER_URL}/authorize",
        "token_endpoint": f"{SERVER_URL}/token",
        "registration_endpoint": f"{SERVER_URL}/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "code_challenge_methods_supported": ["S256"]
    })


async def oauth_register(request):
    """Dynamic client registration endpoint."""
    body = await request.json()
    client_id = str(uuid.uuid4())
    
    return JSONResponse({
        "client_id": client_id,
        "client_secret": "",  # No secret for public clients
        "client_id_issued_at": 0,
        "client_secret_expires_at": 0,
        "redirect_uris": body.get("redirect_uris", []),
        "grant_types": ["authorization_code"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none"
    })


async def oauth_authorize(request):
    """Authorization endpoint - auto-approves and redirects with code."""
    redirect_uri = request.query_params.get("redirect_uri")
    state = request.query_params.get("state", "")
    code = str(uuid.uuid4())
    
    # Redirect back with authorization code
    from starlette.responses import RedirectResponse
    redirect_url = f"{redirect_uri}?code={code}&state={state}"
    return RedirectResponse(url=redirect_url, status_code=302)


async def oauth_token(request):
    """Token endpoint - issues a dummy access token."""
    return JSONResponse({
        "access_token": str(uuid.uuid4()),
        "token_type": "Bearer",
        "expires_in": 3600
    })


# Create Starlette app with MCP routes
app = Starlette(
    routes=[
        # OAuth 2.1 discovery endpoints (root level for Claude Online)
        Route("/.well-known/oauth-protected-resource", endpoint=oauth_protected_resource),
        Route("/.well-known/oauth-authorization-server", endpoint=oauth_authorization_server),
        Route("/register", endpoint=oauth_register, methods=["POST"]),
        Route("/authorize", endpoint=oauth_authorize, methods=["GET"]),
        Route("/token", endpoint=oauth_token, methods=["POST"]),
        # Mount MCP Streamable HTTP app
        Mount("/mcp", app=mcp.streamable_http_app()),
    ],
    lifespan=lifespan
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)

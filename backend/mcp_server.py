"""
Portland OCDS MCP Server

Provides Claude access to Portland's Open Contracting Data Standard (OCDS) 
tender and contract data via the Model Context Protocol.

Transport modes:
- stdio: For local Claude Desktop use (run this file directly)
- HTTP: For remote access via serve_mcp.py ASGI wrapper
"""

import os
from typing import Optional
from mcp.server.fastmcp import FastMCP
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/tenders_db"
)

def get_db_connection():
    """Create a new database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# Initialize MCP server
mcp = FastMCP(
    "Portland OCDS",
    instructions="""You are an assistant with access to Portland, Oregon's 
    Open Contracting Data Standard (OCDS) procurement database. 
    
    Use get_database_overview first to understand the dataset scope.
    Use search_tenders to find specific procurement opportunities.
    Use get_tender_stats for aggregate analysis by status.
    Use search_contracts to explore signed agreements and implementation data.
    """
)


@mcp.tool()
def get_database_overview() -> dict:
    """
    Get a high-level overview of the Portland OCDS database.
    
    Returns counts of tenders, contracts, items, milestones, transactions,
    purchase orders, total award value, and the date range covered.
    
    Call this first to understand the scope of available data.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    COUNT(DISTINCT t.id) as tender_count,
                    (SELECT COUNT(*) FROM tenders t2, 
                     jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as contract_count,
                    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'items', '[]'::jsonb))), 0) 
                     FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as item_count,
                    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'milestones', '[]'::jsonb))), 0) 
                     FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as milestone_count,
                    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'implementation'->'transactions', '[]'::jsonb))), 0) 
                     FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as transaction_count,
                    (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'implementation'->'purchaseOrders', '[]'::jsonb))), 0) 
                     FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as purchase_order_count,
                    (SELECT COALESCE(SUM((a.value->'value'->>'amount')::numeric), 0)
                     FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'awards', '[]'::jsonb)) a
                     WHERE a.value->'value'->>'amount' IS NOT NULL) as total_award_value,
                    (SELECT MIN(LEAST(
                        NULLIF(t2.data->'tender'->'tenderPeriod'->>'startDate', '')::timestamp,
                        NULLIF(t2.data->>'date', '')::timestamp
                    )) FROM tenders t2) as min_date,
                    (SELECT MAX(GREATEST(
                        COALESCE(NULLIF(t2.data->'tender'->'tenderPeriod'->>'endDate', '')::timestamp, '1900-01-01'::timestamp),
                        COALESCE(NULLIF(t2.data->>'date', '')::timestamp, '1900-01-01'::timestamp)
                    )) FROM tenders t2) as max_date
                FROM tenders t
            """)
            result = cur.fetchone()
            
            return {
                "tenders": result["tender_count"] or 0,
                "contracts": result["contract_count"] or 0,
                "items": result["item_count"] or 0,
                "milestones": result["milestone_count"] or 0,
                "transactions": result["transaction_count"] or 0,
                "purchaseOrders": result["purchase_order_count"] or 0,
                "totalAwardValue": float(result["total_award_value"] or 0),
                "currency": "USD",
                "minDate": result["min_date"].isoformat() if result["min_date"] else None,
                "maxDate": result["max_date"].isoformat() if result["max_date"] else None,
                "description": "Portland, Oregon OCDS procurement data"
            }
    finally:
        conn.close()


@mcp.tool()
def get_tender_stats() -> dict:
    """
    Get aggregate statistics on tenders grouped by status.
    
    Returns counts and total values for each tender status (active, complete, 
    cancelled, unsuccessful, terminated, etc.).
    
    Use this for high-level analysis without hitting result limits.
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            # Status distribution
            cur.execute("""
                SELECT 
                    data->'tender'->>'status' as status, 
                    COUNT(*) as count,
                    COALESCE(SUM((data->'tender'->'value'->>'amount')::numeric), 0) as total_value
                FROM tenders 
                GROUP BY 1 
                ORDER BY 2 DESC
            """)
            status_rows = cur.fetchall()
            
            by_status = {}
            for row in status_rows:
                status = row["status"] or "unknown"
                by_status[status] = {
                    "count": row["count"],
                    "totalValue": float(row["total_value"])
                }
            
            return {
                "byStatus": by_status,
                "statusDefinitions": {
                    "active": "Open for bidding",
                    "complete": "Awarded and fulfilled",
                    "cancelled": "Cancelled before completion",
                    "unsuccessful": "No suitable bids received",
                    "terminated": "Successfully concluded (OCDS term for completed)"
                }
            }
    finally:
        conn.close()


@mcp.tool()
def search_tenders(
    query: Optional[str] = None,
    status: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    limit: int = 25
) -> dict:
    """
    Search Portland OCDS tenders with filtering options.
    
    Args:
        query: Text search in tender title or ID (optional)
        status: Filter by status: active, complete, cancelled, unsuccessful, terminated (optional)
        min_value: Minimum tender value in USD (optional)
        max_value: Maximum tender value in USD (optional)
        limit: Maximum results to return (default 25, max 50)
    
    Returns a list of matching tenders with key fields extracted.
    """
    limit = min(limit, 50)  # Cap at 50 results
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            conditions = []
            params = {}
            
            if query:
                conditions.append(
                    "(title ILIKE %(query)s OR tender_id ILIKE %(query)s)"
                )
                params["query"] = f"%{query}%"
            
            if status:
                conditions.append("data->'tender'->>'status' = %(status)s")
                params["status"] = status
            
            if min_value is not None:
                conditions.append(
                    "(data->'tender'->'value'->>'amount')::numeric >= %(min_value)s"
                )
                params["min_value"] = min_value
            
            if max_value is not None:
                conditions.append(
                    "(data->'tender'->'value'->>'amount')::numeric <= %(max_value)s"
                )
                params["max_value"] = max_value
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            cur.execute(f"""
                SELECT 
                    tender_id,
                    title,
                    data->'tender'->>'status' as status,
                    (data->'tender'->'value'->>'amount')::numeric as value,
                    data->'tender'->'value'->>'currency' as currency,
                    data->'tender'->'tenderPeriod'->>'startDate' as start_date,
                    data->'tender'->'tenderPeriod'->>'endDate' as end_date,
                    jsonb_array_length(COALESCE(data->'contracts', '[]'::jsonb)) as contract_count,
                    jsonb_array_length(COALESCE(data->'awards', '[]'::jsonb)) as award_count
                FROM tenders
                WHERE {where_clause}
                ORDER BY data->>'date' DESC NULLS LAST
                LIMIT %(limit)s
            """, {**params, "limit": limit})
            
            results = cur.fetchall()
            
            tenders = []
            for row in results:
                tenders.append({
                    "tenderId": row["tender_id"],
                    "title": row["title"],
                    "status": row["status"],
                    "value": float(row["value"]) if row["value"] else None,
                    "currency": row["currency"] or "USD",
                    "startDate": row["start_date"],
                    "endDate": row["end_date"],
                    "contractCount": row["contract_count"],
                    "awardCount": row["award_count"]
                })
            
            return {
                "results": tenders,
                "count": len(tenders),
                "limit": limit,
                "note": f"Showing up to {limit} results. Use filters to narrow search."
            }
    finally:
        conn.close()


@mcp.tool()
def get_tender_details(tender_id: str) -> dict:
    """
    Get the full OCDS record for a specific tender.
    
    Args:
        tender_id: The OCDS tender ID (e.g., 'ocds-ptecst-30004792')
    
    Returns the complete OCDS release including tender, awards, contracts,
    and implementation data (transactions, milestones, purchase orders).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT data FROM tenders 
                WHERE tender_id = %(tender_id)s
            """, {"tender_id": tender_id})
            
            result = cur.fetchone()
            
            if not result:
                # Try fallback search by OCDS ID field
                cur.execute("""
                    SELECT data FROM tenders 
                    WHERE data->>'id' = %(tender_id)s
                """, {"tender_id": tender_id})
                result = cur.fetchone()
            
            if not result:
                return {"error": f"Tender '{tender_id}' not found"}
            
            return {"data": result["data"]}
    finally:
        conn.close()


@mcp.tool()
def search_contracts(
    vendor: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    limit: int = 25
) -> dict:
    """
    Search contracts across all tenders.
    
    Args:
        vendor: Search vendor/supplier name (optional)
        min_value: Minimum contract value in USD (optional)
        max_value: Maximum contract value in USD (optional)
        limit: Maximum results to return (default 25, max 50)
    
    Returns contracts with parent tender context and implementation summary.
    """
    limit = min(limit, 50)
    
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            conditions = []
            params = {"limit": limit}
            
            if vendor:
                conditions.append(
                    "c.value->'suppliers'->0->>'name' ILIKE %(vendor)s"
                )
                params["vendor"] = f"%{vendor}%"
            
            if min_value is not None:
                conditions.append(
                    "(c.value->'value'->>'amount')::numeric >= %(min_value)s"
                )
                params["min_value"] = min_value
            
            if max_value is not None:
                conditions.append(
                    "(c.value->'value'->>'amount')::numeric <= %(max_value)s"
                )
                params["max_value"] = max_value
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            cur.execute(f"""
                SELECT 
                    c.value->>'id' as contract_id,
                    c.value->>'title' as title,
                    c.value->>'status' as status,
                    (c.value->'value'->>'amount')::numeric as value,
                    c.value->'value'->>'currency' as currency,
                    c.value->>'dateSigned' as date_signed,
                    c.value->'suppliers'->0->>'name' as vendor_name,
                    t.tender_id,
                    t.data->'tender'->>'title' as tender_title,
                    jsonb_array_length(COALESCE(c.value->'implementation'->'transactions', '[]'::jsonb)) as transaction_count,
                    jsonb_array_length(COALESCE(c.value->'implementation'->'milestones', '[]'::jsonb)) as milestone_count
                FROM 
                    tenders t,
                    jsonb_array_elements(COALESCE(t.data->'contracts', '[]'::jsonb)) c
                WHERE {where_clause}
                ORDER BY (c.value->>'dateSigned')::timestamp DESC NULLS LAST
                LIMIT %(limit)s
            """, params)
            
            results = cur.fetchall()
            
            contracts = []
            for row in results:
                contracts.append({
                    "contractId": row["contract_id"],
                    "title": row["title"],
                    "status": row["status"],
                    "value": float(row["value"]) if row["value"] else None,
                    "currency": row["currency"] or "USD",
                    "dateSigned": row["date_signed"],
                    "vendorName": row["vendor_name"],
                    "tenderId": row["tender_id"],
                    "tenderTitle": row["tender_title"],
                    "transactionCount": row["transaction_count"],
                    "milestoneCount": row["milestone_count"]
                })
            
            return {
                "results": contracts,
                "count": len(contracts),
                "limit": limit
            }
    finally:
        conn.close()


if __name__ == "__main__":
    # Run with stdio transport for local Claude Desktop use
    mcp.run()

import os
from fastapi import FastAPI, Depends, Query
from sqlalchemy import create_engine, Column, Integer, String, JSON, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import JSONB

app = FastAPI(title="Portland OCDS API", version="3.0.0")

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/tenders_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Model
class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    tender_id = Column(String, unique=True, index=True)
    title = Column(String)
    data = Column(JSONB)  # The full OCDS JSON object

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def startup():
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    # Create GIN index for JSONB search if not exists
    with engine.connect() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_tenders_data ON tenders USING gin (data);"))
        conn.commit()

@app.get("/tenders")
def get_tenders(
    limit: int = 50,
    offset: int = 0,
    search: str = None,
    status: str = None,
    min_value: float = None,
    active_at: str = None,
    has_date: str = None,
    sort_by: str = "dateModified",
    descending: bool = True,
    db: Session = Depends(get_db)
):
    query = db.query(Tender)

    # Search (Simple ILIKE on title or ID)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Tender.title.ilike(search_term)) | 
            (Tender.tender_id.ilike(search_term))
        )

    # Status Filter
    if status and status != "all":
        # Status is stored in data->'tender'->>'status'
        query = query.filter(text("data->'tender'->>'status' = :status")).params(status=status)

    # Min Value Filter
    if min_value is not None:
        query = query.filter(text("(data->'tender'->'value'->>'amount')::numeric > :min_val")).params(min_val=min_value)

    # Active At Filter
    if active_at:
        query = query.filter(text("(data->'tender'->'tenderPeriod'->>'startDate')::timestamp <= :active_at::timestamp AND (data->'tender'->'tenderPeriod'->>'endDate')::timestamp >= :active_at::timestamp")).params(active_at=active_at)

    # Has Date Filter (Tender Date Present)
    if has_date:
        if has_date == "yes":
            query = query.filter(text("data->'tender'->'tenderPeriod'->>'startDate' IS NOT NULL"))
        elif has_date == "no":
             query = query.filter(text("data->'tender'->'tenderPeriod'->>'startDate' IS NULL"))

    # Sorting
    if sort_by == "value":
        sort_field = "(data->'tender'->'value'->>'amount')::numeric"
    elif sort_by == "dateModified":
         sort_field = "data->>'date'"
    elif sort_by == "title":
        # Case-insensitive sort, fallback to JSON if column empty
        sort_field = "lower(COALESCE(title, data->'tender'->>'title'))"
    elif sort_by == "startDate":
        sort_field = "data->'tender'->'tenderPeriod'->>'startDate'"
    elif sort_by == "endDate":
        sort_field = "data->'tender'->'tenderPeriod'->>'endDate'"
    elif sort_by == "complexity":
        # Sort by sum of details (Awards + Contracts + Documents + Items + Milestones + Bids)
        # Using jsonb_array_length with COALESCE to handle nulls (defaults to empty array '[]')
        sort_field = """(
            jsonb_array_length(COALESCE(data->'tender'->'awards', '[]'::jsonb)) +
            jsonb_array_length(COALESCE(data->'contracts', '[]'::jsonb)) +
            jsonb_array_length(COALESCE(data->'tender'->'documents', '[]'::jsonb)) +
            jsonb_array_length(COALESCE(data->'tender'->'items', '[]'::jsonb)) +
            jsonb_array_length(COALESCE(data->'tender'->'milestones', '[]'::jsonb)) +
            jsonb_array_length(COALESCE(data->'bids', '[]'::jsonb))
        )"""
    else:
        sort_field = "data->>'date'"

    direction = "DESC" if descending else "ASC"
    query = query.order_by(text(f"{sort_field} {direction}"))

    total = query.count()
    tenders = query.offset(offset).limit(limit).all()

    # Wrap in OCDS-like response structure for compatibility
    return {
        "data": [t.data for t in tenders],
        "meta": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }

@app.get("/tenders/meta/statuses")
def get_status_counts(db: Session = Depends(get_db)):
    # Group by status
    # using data->'tender'->>'status'
    sql = text("SELECT data->'tender'->>'status' as status, COUNT(*) as count FROM tenders GROUP BY 1 ORDER BY 2 DESC")
    result = db.execute(sql).fetchall()
    
    stats = {}
    for row in result:
        # row is tuple (status, count)
        status = row[0]
        count = row[1]
        if status:
            stats[status] = count
            
    return stats

@app.get("/tenders/stats")
def get_stats(db: Session = Depends(get_db)):
    """
    Get aggregate statistics across all tenders including:
    - Counts: tenders, contracts, items, milestones, transactions, purchase orders
    - Total award value
    - Date range (min/max dates)
    """
    stats_sql = text("""
        SELECT
            -- Tender count
            COUNT(DISTINCT t.id) as tender_count,
            -- Contract count
            (SELECT COUNT(*) FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as contract_count,
            -- Items count (from all contracts)
            (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'items', '[]'::jsonb))), 0) 
             FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as item_count,
            -- Milestones count (from all contracts)
            (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'milestones', '[]'::jsonb))), 0) 
             FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as milestone_count,
            -- Transactions count (from all contracts)
            (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'implementation'->'transactions', '[]'::jsonb))), 0) 
             FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as transaction_count,
            -- Purchase orders count (from all contracts)
            (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(c.value->'implementation'->'purchaseOrders', '[]'::jsonb))), 0) 
             FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'contracts', '[]'::jsonb)) c) as purchase_order_count,
            -- Total award value (awards have value.amount structure)
            (SELECT COALESCE(SUM((a.value->'value'->>'amount')::numeric), 0)
             FROM tenders t2, jsonb_array_elements(COALESCE(t2.data->'awards', '[]'::jsonb)) a
             WHERE a.value->'value'->>'amount' IS NOT NULL) as total_award_value,
            -- Min date (earliest tender start date or contract date)
            (SELECT MIN(LEAST(
                NULLIF(t2.data->'tender'->'tenderPeriod'->>'startDate', '')::timestamp,
                NULLIF(t2.data->>'date', '')::timestamp
            ))
             FROM tenders t2) as min_date,
            -- Max date (latest tender end date, modification date, or contract date)
            (SELECT MAX(GREATEST(
                COALESCE(NULLIF(t2.data->'tender'->'tenderPeriod'->>'endDate', '')::timestamp, '1900-01-01'::timestamp),
                COALESCE(NULLIF(t2.data->>'date', '')::timestamp, '1900-01-01'::timestamp)
            ))
             FROM tenders t2) as max_date
        FROM tenders t
    """)
    
    result = db.execute(stats_sql).fetchone()
    
    return {
        "tenders": result[0] or 0,
        "contracts": result[1] or 0,
        "items": result[2] or 0,
        "milestones": result[3] or 0,
        "transactions": result[4] or 0,
        "purchaseOrders": result[5] or 0,
        "totalAwardValue": float(result[6] or 0),
        "minDate": result[7].isoformat() if result[7] else None,
        "maxDate": result[8].isoformat() if result[8] else None
    }

@app.get("/tenders/{tender_id}")
def get_tender_by_id(tender_id: str, db: Session = Depends(get_db)):
    # Search by OCDS tenderID (which is stored in tender_id column)
    # Note: frontend sends OCDS ID e.g. "ocds-ptecst-123"
    tender = db.query(Tender).filter(Tender.tender_id == tender_id).first()
    
    if not tender:
        # Fallback: try to search by internal ID (OCDS 'id' field in data)
        tender = db.query(Tender).filter(text("data->>'id' = :tid")).params(tid=tender_id).first()

    if not tender:
        return {"data": None, "error": "Not Found"}

    return {"data": tender.data}

@app.get("/contracts")
def get_contracts(
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "dateSigned",
    descending: bool = True,
    db: Session = Depends(get_db)
):
    # Flatten contracts from all tenders
    # We select the contract object and the parent tenderID for context
    
    # Base selection
    base_query = """
        SELECT 
            c.value as contract,
            t.data->>'id' as ocds_id,
            t.data->'tender'->>'title' as tender_title
        FROM 
            tenders t,
            jsonb_array_elements(COALESCE(t.data->'contracts', '[]'::jsonb)) c
    """

    # Sorting
    if sort_by == "value":
        sort_field = "(c.value->'value'->>'amount')::numeric"
    elif sort_by == "dateSigned":
        sort_field = "(c.value->>'dateSigned')::timestamp"
    else:
        sort_field = "(c.value->>'dateSigned')::timestamp"
    
    direction = "DESC" if descending else "ASC"
    
    order_clause = f"ORDER BY {sort_field} {direction} NULLS LAST"
    
    # Pagination
    limit_clause = f"LIMIT {limit} OFFSET {offset}"
    
    # Final Query
    sql = f"{base_query} {order_clause} {limit_clause}"
    
    result = db.execute(text(sql)).fetchall()
    
    # Count Query (Expensive query, maybe estimate or cache later? For now direct count)
    count_sql = "SELECT count(*) FROM tenders t, jsonb_array_elements(COALESCE(t.data->'contracts', '[]'::jsonb)) c"
    total = db.execute(text(count_sql)).scalar()

    contracts = []
    for row in result:
        # row keys: contract, ocds_id, tender_title
        # We wrap it to provide context
        contract = row[0]
        # Inject context into contract object for frontend convenience (or keep separate)
        # Let's keep the contract object pure OCDS but maybe add a helper field if needed.
        # Ideally frontend receives a wrapper.
        contracts.append({
            "contract": contract,
            "tender_id": row[1],
            "tender_title": row[2]
        })

    return {
        "data": contracts,
        "meta": {
            "total": total,
            "limit": limit,
            "offset": offset
        }
    }

@app.get("/contracts/{contract_id}")
def get_contract(contract_id: str, db: Session = Depends(get_db)):
    sql = """
        SELECT 
            c.value as contract,
            t.data->>'id' as ocds_id,
            t.data->'tender'->>'title' as tender_title
        FROM 
            tenders t,
            jsonb_array_elements(COALESCE(t.data->'contracts', '[]'::jsonb)) c
        WHERE
            c.value->>'id' = :contract_id
        LIMIT 1
    """
    
    result = db.execute(text(sql), {"contract_id": contract_id}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    contract = result[0]
    return {
        "contract": contract,
        "tender_id": result[1],
        "tender_title": result[2]
    }

@app.get("/health")
def health():
    return {"status": "ok"}

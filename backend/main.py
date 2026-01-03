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

@app.get("/health")
def health():
    return {"status": "ok"}

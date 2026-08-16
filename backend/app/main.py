from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import emails

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mailworker Freight Extraction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emails.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

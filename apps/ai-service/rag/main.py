"""FastAPI entrypoint for the Ayurvedic RAG ingestion API."""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from config.vectordb import bootstrap_collections
from routes.ayurvedic_routes import router as ayurvedic_router
from routes.ayurvedic_query_routes import router as query_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup hooks before serving requests."""
    try:
        bootstrap_collections()
    except Exception as e:
        logger.exception("bootstrap_collections failed: %s", e)
        raise
    yield


app = FastAPI(
    title="Ayurvedic RAG — Ingestion API",
    version="1.0.0",
    lifespan=lifespan,
)
app.include_router(ayurvedic_router)
app.include_router(query_router)


@app.get("/")
async def health() -> dict[str, str]:
    """Liveness probe for orchestration and load balancers."""
    return {"status": "ok", "service": "ayurvedic-rag"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000)

from __future__ import annotations

import sys
import traceback
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

from .api.routes import (
    audit,
    auth,
    branches,
    categories,
    companies,
    inventory,
    matrices,
    operations,
    products,
    reports,
    sales,
    targets,
    users,
    vectors,
)
from .core.config import settings
from .db import init_db

STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    429: "too_many_requests",
    500: "internal_error",
}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="API de MatrixFlow Enterprise (Fase 2 del Plan Maestro)",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.detail if isinstance(exc.detail, str) else "Error",
            "code": STATUS_CODES.get(exc.status_code, "error"),
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = [
        {"loc": [str(part) for part in err.get("loc", [])], "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "message": "Datos inválidos",
            "code": "validation_error",
            "details": {"errors": errors},
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = f"UNHANDLED {request.method} {request.url.path}\n{traceback.format_exc()}"
    print(tb, file=sys.stderr, flush=True)
    try:
        from pathlib import Path

        log_path = Path(__file__).resolve().parents[1] / "error.log"
        with log_path.open("a", encoding="utf-8") as fh:
            fh.write(tb + "\n")
    except Exception:
        pass
    return JSONResponse(
        status_code=500,
        content={"message": "Error interno del servidor", "code": "internal_error"},
    )


api_router = APIRouter(prefix=settings.API_V1_PREFIX)
for route_module in (
    auth,
    companies,
    branches,
    products,
    categories,
    sales,
    inventory,
    targets,
    vectors,
    matrices,
    operations,
    users,
    audit,
    reports,
):
    api_router.include_router(route_module.router)

app.include_router(api_router)


@app.get("/", tags=["health"])
def root() -> dict:
    return {"name": settings.PROJECT_NAME, "version": app.version, "docs": "/docs"}


@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


def route_path(route: APIRoute) -> str:
    return route.path


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

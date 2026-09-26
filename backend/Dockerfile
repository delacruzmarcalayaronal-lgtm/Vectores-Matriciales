# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x /app/entrypoint.sh
EXPOSE 8000
# entrypoint tolerante: expande $PORT aunque la plataforma pise el CMD
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
CMD ["exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

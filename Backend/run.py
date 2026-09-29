import os
import uvicorn

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    is_prod = os.getenv("ENV") == "production"
    print(f"Starting Zoom Clone Backend on port {port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=not is_prod)

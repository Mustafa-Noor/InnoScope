from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import roadmap, auth
from app.database import engine, Base


app = FastAPI()

app.include_router(roadmap.router)
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],         # Allow all origins
    allow_credentials=True,      # Allow cookies, authorization headers, etc.
    allow_methods=["*"],         # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],         # Allow all headers
)

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
def read_root():
    return {"Welcome": "to InnoScope Backend!"}

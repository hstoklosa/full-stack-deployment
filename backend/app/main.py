from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import List

from .database import get_db, engine, Base
from .models import Todo
from .schemas import TodoCreate, TodoResponse

app = FastAPI(root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://deploy.hstoklosa.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint that verifies database connection"""
    result = await db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected"}


@app.post("/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(todo: TodoCreate, db: AsyncSession = Depends(get_db)):
    """Create a new todo"""
    db_todo = Todo(
        title=todo.title,
        description=todo.description,
        completed=todo.completed,
    )
    db.add(db_todo)
    await db.commit()
    await db.refresh(db_todo)
    return db_todo


@app.get("/todos", response_model=List[TodoResponse])
async def get_all_todos(db: AsyncSession = Depends(get_db)):
    """Fetch all todos"""
    result = await db.execute(select(Todo).order_by(Todo.created_at.desc()))
    todos = result.scalars().all()
    return todos
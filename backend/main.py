import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db

app = FastAPI(title="Quick To-Do", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(db.router)


class TaskCreate(BaseModel):
    title: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None


class TaskOut(BaseModel):
    id: str
    title: str
    done: bool
    created_at: str


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/tasks", response_model=TaskOut)
def create_task(task_in: TaskCreate):
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    task = {"id": task_id, "title": task_in.title, "done": False, "created_at": now}
    db.add_record("tasks", task)
    return task


@app.get("/api/tasks", response_model=List[TaskOut])
def list_tasks(filter: Optional[str] = Query(None, alias="filter")):
    tasks = db.list_records("tasks")
    if filter == "Active":
        tasks = [t for t in tasks if not t.get("done", False)]
    elif filter == "Done":
        tasks = [t for t in tasks if t.get("done", False)]
    return tasks


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, task_in: TaskUpdate):
    tasks = db.list_records("tasks")
    existing = next((t for t in tasks if t["id"] == task_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = {}
    if task_in.title is not None:
        update_data["title"] = task_in.title
    if task_in.done is not None:
        update_data["done"] = task_in.done
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    db.update_record(task_id, update_data)
    updated = next((t for t in db.list_records("tasks") if t["id"] == task_id), None)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found after update")
    return updated


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    tasks = db.list_records("tasks")
    existing = next((t for t in tasks if t["id"] == task_id), None)
    if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete_record(task_id)
    return {"detail": "Task deleted"}

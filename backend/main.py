import secrets
from datetime import datetime
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db

app = FastAPI(title="Quick To-Do")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(db.router)


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


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


@app.post("/api/tasks", response_model=TaskOut)
def create_task(task_in: TaskCreate):
    now = datetime.utcnow().isoformat()
    data = {
        "title": task_in.title,
        "done": False,
        "created_at": now,
    }
    record = db.add_record("tasks", data)
    return record


@app.get("/api/tasks", response_model=List[TaskOut])
def list_tasks(filter: Optional[str] = Query("all", alias="filter")):
    records = db.list_records("tasks")
    if filter == "active":
        records = [r for r in records if not r.get("done")]
    elif filter == "done":
        records = [r for r in records if r.get("done")]
    return records


@app.put("/api/tasks/{task_id}", response_model=TaskOut)
def update_task(task_id: str, task_in: TaskUpdate):
    records = db.list_records("tasks")
    found = False
    for r in records:
        if r.get("id") == task_id:
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = {}
    if task_in.title is not None:
        update_data["title"] = task_in.title
    if task_in.done is not None:
        update_data["done"] = task_in.done
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    updated = db.update_record(task_id, update_data)
    return updated


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    records = db.list_records("tasks")
    found = False
    for r in records:
        if r.get("id") == task_id:
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete_record(task_id)
    return {"detail": "Task deleted"}

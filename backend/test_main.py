from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "ok"

def test_create_task():
    response = client.post("/api/tasks", json={"title": "Test task"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["id"], str)
    assert isinstance(data["title"], str)
    assert isinstance(data["done"], bool)
    assert isinstance(data["created_at"], str)
    assert data["title"] == "Test task"
    assert data["done"] is False

def test_list_tasks():
    client.post("/api/tasks", json={"title": "Task for listing"})
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        task = data[0]
        assert isinstance(task["id"], str)
        assert isinstance(task["title"], str)
        assert isinstance(task["done"], bool)
        assert isinstance(task["created_at"], str)

def test_list_tasks_filter_active():
    resp = client.post("/api/tasks", json={"title": "Active task"})
    active_id = resp.json()["id"]
    resp = client.post("/api/tasks", json={"title": "Done task"})
    done_task_id = resp.json()["id"]
    client.put(f"/api/tasks/{done_task_id}", json={"done": True})
    
    response = client.get("/api/tasks", params={"filter": "Active"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for task in data:
        assert task["done"] is False

def test_list_tasks_filter_done():
    client.post("/api/tasks", json={"title": "Another active task"})
    resp = client.post("/api/tasks", json={"title": "Another done task"})
    done_task_id = resp.json()["id"]
    client.put(f"/api/tasks/{done_task_id}", json={"done": True})
    
    response = client.get("/api/tasks", params={"filter": "Done"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for task in data:
        assert task["done"] is True

def test_update_task_title():
    resp = client.post("/api/tasks", json={"title": "Old title"})
    task_id = resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={"title": "New title"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["id"], str)
    assert isinstance(data["title"], str)
    assert isinstance(data["done"], bool)
    assert isinstance(data["created_at"], str)
    assert data["title"] == "New title"

def test_update_task_done():
    resp = client.post("/api/tasks", json={"title": "Task to complete"})
    task_id = resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={"done": True})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["id"], str)
    assert isinstance(data["title"], str)
    assert isinstance(data["done"], bool)
    assert isinstance(data["created_at"], str)
    assert data["done"] is True

def test_update_task_no_fields():
    resp = client.post("/api/tasks", json={"title": "Task no update"})
    task_id = resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={})
    assert response.status_code == 400

def test_update_task_not_found():
    response = client.put("/api/tasks/nonexistent-id", json={"title": "Does not matter"})
    assert response.status_code == 404

def test_delete_task():
    resp = client.post("/api/tasks", json={"title": "Task to delete"})
    task_id = resp.json()["id"]
    
    response = client.delete(f"/api/tasks/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert "detail" in data
    assert data["detail"] == "Task deleted"

def test_delete_task_not_found():
    response = client.delete("/api/tasks/nonexistent-id")
    assert response.status_code == 404
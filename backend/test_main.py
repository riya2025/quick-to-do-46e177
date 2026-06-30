from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_create_task():
    response = client.post("/api/tasks", json={"title": "Test task"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["id"], str)
    assert data["title"] == "Test task"
    assert data["done"] is False
    assert isinstance(data["created_at"], str)


def test_list_tasks_all():
    # Create a task first to ensure the list is not empty
    client.post("/api/tasks", json={"title": "Task for list all"})
    response = client.get("/api/tasks", params={"filter": "all"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if data:
        task = data[-1]
        assert isinstance(task["id"], str)
        assert isinstance(task["title"], str)
        assert isinstance(task["done"], bool)
        assert isinstance(task["created_at"], str)


def test_list_tasks_active():
    # Create a task and ensure it's not done
    client.post("/api/tasks", json={"title": "Active task"})
    response = client.get("/api/tasks", params={"filter": "active"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for task in data:
        assert task["done"] is False


def test_list_tasks_done():
    # Create a task and mark it as done
    create_resp = client.post("/api/tasks", json={"title": "Done task"})
    task_id = create_resp.json()["id"]
    client.put(f"/api/tasks/{task_id}", json={"done": True})
    
    response = client.get("/api/tasks", params={"filter": "done"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for task in data:
        assert task["done"] is True


def test_update_task_title():
    create_resp = client.post("/api/tasks", json={"title": "Original title"})
    task_id = create_resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={"title": "Updated title"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["title"] == "Updated title"
    assert data["done"] is False
    assert isinstance(data["created_at"], str)


def test_update_task_done():
    create_resp = client.post("/api/tasks", json={"title": "Task to complete"})
    task_id = create_resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={"done": True})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == task_id
    assert data["done"] is True
    assert isinstance(data["title"], str)
    assert isinstance(data["created_at"], str)


def test_update_task_not_found():
    response = client.put("/api/tasks/nonexistent-id", json={"title": "Doesn't matter"})
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"


def test_update_task_no_fields():
    create_resp = client.post("/api/tasks", json={"title": "Task no update"})
    task_id = create_resp.json()["id"]
    
    response = client.put(f"/api/tasks/{task_id}", json={})
    assert response.status_code == 400
    assert response.json()["detail"] == "No fields to update"


def test_delete_task():
    create_resp = client.post("/api/tasks", json={"title": "Task to delete"})
    task_id = create_resp.json()["id"]
    
    response = client.delete(f"/api/tasks/{task_id}")
    assert response.status_code == 200
    assert response.json()["detail"] == "Task deleted"


def test_delete_task_not_found():
    response = client.delete("/api/tasks/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found"
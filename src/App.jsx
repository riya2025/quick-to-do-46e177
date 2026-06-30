import React, { useState, useEffect, useRef, useMemo, useReducer } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';

const COLLECTION = 'tasks';

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const isLoaded = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLECTION);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        /* ignore parse error */
      }
    }

    const apiBase = window.API_BASE;
    if (!apiBase) {
      isLoaded.current = true;
      return;
    }

    fetch(apiBase + '/api/store/' + COLLECTION)
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(data => {
        setTasks(data);
        localStorage.setItem(COLLECTION, JSON.stringify(data));
      })
      .catch(() => {})
      .finally(() => {
        isLoaded.current = true;
      });
  }, []);

  const persist = (updated) => {
    setTasks(updated);
    localStorage.setItem(COLLECTION, JSON.stringify(updated));
  };

  const addTask = async (title) => {
    const record = { title, done: false, createdAt: Date.now() };
    const apiBase = window.API_BASE;
    if (apiBase) {
      try {
        const res = await fetch(apiBase + '/api/store/' + COLLECTION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: record })
        });
        const saved = await res.json();
        persist([...tasks, saved]);
        return;
      } catch (e) { /* fallback local */ }
    }
    const local = { ...record, id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9) };
    persist([...tasks, local]);
  };

  const toggleTask = async (id) => {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const updated = [...tasks];
    updated[idx] = { ...updated[idx], done: !updated[idx].done };
    persist(updated);
    const apiBase = window.API_BASE;
    if (apiBase) {
      try {
        await fetch(apiBase + '/api/store/' + COLLECTION + '/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: updated[idx] })
        });
      } catch (e) { /* ignore */ }
    }
  };

  const deleteTask = async (id) => {
    persist(tasks.filter(t => t.id !== id));
    const apiBase = window.API_BASE;
    if (apiBase) {
      try {
        await fetch(apiBase + '/api/store/' + COLLECTION + '/' + id, { method: 'DELETE' });
      } catch (e) { /* ignore */ }
    }
  };

  return { tasks, addTask, toggleTask, deleteTask };
}

function TopBar() {
  return (
    <header className="topbar">
      <div className="container row">
        <Link to="/" className="nav brand">Quick To-Do</Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav link active' : 'nav link'}>All</NavLink>
          <NavLink to="/active" className={({ isActive }) => isActive ? 'nav link active' : 'nav link'}>Active</NavLink>
          <NavLink to="/done" className={({ isActive }) => isActive ? 'nav link active' : 'nav link'}>Done</NavLink>
        </nav>
      </div>
    </header>
  );
}

function TaskInput({ onAdd }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
    inputRef.current && inputRef.current.focus();
  };

  return (
    <form className="row task-input" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        placeholder="What needs to be done?"
        value={value}
        onChange={e => setValue(e.target.value)}
        aria-label="New task title"
      />
      <button className="btn btn-primary" type="submit">Add</button>
    </form>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  const imgId = (parseInt(task.id.replace(/\D/g, ''), 10) % 70) + 1;
  const avatarUrl = `https://i.pravatar.cc/300?img=${imgId}`;
  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(task.id)}/40/40`;

  const handleImgError = (e) => {
    e.target.onerror = null;
    e.target.src = fallbackUrl;
  };

  return (
    <li className="list-item task-item">
      <img
        className="avatar task-avatar"
        src={avatarUrl}
        alt=""
        onError={handleImgError}
      />
      <label className={`field task-label ${task.done ? 'done muted' : ''}`}>
        <input
          type="checkbox"
          className="task-checkbox"
          checked={task.done}
          onChange={() => onToggle(task.id)}
          aria-label={`Mark ${task.title} as ${task.done ? 'active' : 'done'}`}
        />
        <span className="task-title">{task.title}</span>
      </label>
      {task.done && <span className="pill badge-done">Done</span>}
      {!task.done && <span className="pill badge-active">Active</span>}
      <button className="btn btn-delete" onClick={() => onDelete(task.id)} aria-label="Delete task">✕</button>
    </li>
  );
}

function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="center box empty-state">
        <p className="muted">No tasks here. Add one above!</p>
      </div>
    );
  }

  return (
    <ul className="list">
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function Stats({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const active = total - done;

  return (
    <div className="row stats">
      <div className="stat box">
        <span className="stat-number">{total}</span>
        <span className="muted">Total</span>
      </div>
      <div className="stat box">
        <span className="stat-number primary">{active}</span>
        <span className="muted">Active</span>
      </div>
      <div className="stat box">
        <span className="stat-number">{done}</span>
        <span className="muted">Done</span>
      </div>
    </div>
  );
}

function TaskPage({ filter }) {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();

  const filtered = useMemo(() => {
    if (filter === 'active') return tasks.filter(t => !t.done);
    if (filter === 'done') return tasks.filter(t => t.done);
    return tasks;
  }, [tasks, filter]);

  const heading = filter === 'active' ? 'Active Tasks' : filter === 'done' ? 'Completed Tasks' : 'All Tasks';

  return (
    <div className="container wrap">
      <div className="hero">
        <h1 className="hero-title">Quick To-Do</h1>
        <p className="muted hero-sub">Stay organized, get things done.</p>
      </div>

      <TaskInput onAdd={addTask} />
      <Stats tasks={tasks} />

      <div className="card">
        <h2 className="card-title">{heading}</h2>
        <TaskList tasks={filtered} onToggle={toggleTask} onDelete={deleteTask} />
      </div>
    </div>
  );
}

function AllPage() {
  return <TaskPage filter="all" />;
}

function ActivePage() {
  return <TaskPage filter="active" />;
}

function DonePage() {
  return <TaskPage filter="done" />;
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <TopBar />
        <main className="main">
          <Routes>
            <Route path="/" element={<AllPage />} />
            <Route path="/active" element={<ActivePage />} />
            <Route path="/done" element={<DonePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
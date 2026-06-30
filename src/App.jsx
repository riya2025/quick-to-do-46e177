import React, { useState, useEffect, useRef, useMemo, useReducer } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';

const COLLECTION = 'tasks';

function useTasks() {
  const [tasks, setTasks] = useState([]);
  const isMounted = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLECTION);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) { /* ignore parse error */ }
    }

    const apiBase = window.API_BASE;
    if (apiBase) {
      fetch(apiBase + '/api/store/' + COLLECTION)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTasks(data);
            localStorage.setItem(COLLECTION, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }

    isMounted.current = true;
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      localStorage.setItem(COLLECTION, JSON.stringify(tasks));
    }
  }, [tasks]);

  const apiBase = window.API_BASE;

  const addTask = async (title) => {
    const newTask = { title, done: false, createdAt: Date.now() };
    const tempId = 'temp_' + Date.now();
    const optimisticTask = { id: tempId, ...newTask };
    setTasks(prev => [optimisticTask, ...prev]);

    if (apiBase) {
      try {
        const res = await fetch(apiBase + '/api/store/' + COLLECTION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newTask })
        });
        const saved = await res.json();
        setTasks(prev => prev.map(t => t.id === tempId ? saved : t));
      } catch (err) {
        /* fallback to local state */
      }
    }
  };

  const toggleTask = async (id) => {
    let updatedTask = null;
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        updatedTask = { ...t, done: !t.done };
        return updatedTask;
      }
      return t;
    }));

    if (apiBase && updatedTask) {
      try {
        const { id, ...data } = updatedTask;
        await fetch(apiBase + '/api/store/' + COLLECTION + '/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data })
        });
      } catch (err) {
        /* fallback to local state */
      }
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));

    if (apiBase) {
      try {
        await fetch(apiBase + '/api/store/' + COLLECTION + '/' + id, {
          method: 'DELETE'
        });
      } catch (err) {
        /* fallback to local state */
      }
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
          <NavLink to="/" end className={({ isActive }) => isActive ? 'btn btn-primary' : 'btn'}>Home</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero center">
      <h1>Quick To-Do</h1>
      <p className="muted">Stay organized. Get things done.</p>
    </section>
  );
}

function TaskInput({ onAdd }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed) {
      onAdd(trimmed);
      setTitle('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  return (
    <form className="row card box" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="input"
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <button className="btn btn-primary" type="submit">Add</button>
    </form>
  );
}

function FilterBar({ filter, setFilter, counts }) {
  const filters = ['All', 'Active', 'Done'];

  return (
    <div className="row card box">
      {filters.map(f => (
        <button
          key={f}
          className={filter === f ? 'btn btn-primary' : 'btn'}
          onClick={() => setFilter(f)}
        >
          {f}
          <span className="pill">{f === 'All' ? counts.all : f === 'Active' ? counts.active : counts.done}</span>
        </button>
      ))}
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  const imgId = (task.id.charCodeAt(0) % 70) + 1;
  const fallback = `https://picsum.photos/seed/${task.id}/40/40`;

  return (
    <div className="list-item row card box">
      <img
        className="avatar"
        src={`https://i.pravatar.cc/300?img=${imgId}`}
        alt="avatar"
        onError={(e) => { e.target.src = fallback; }}
      />
      <span className={task.done ? 'muted' : 'primary'} style={{ textDecoration: task.done ? 'line-through' : 'none', flex: 1 }}>
        {task.title}
      </span>
      {task.done && <span className="badge">Done</span>}
      <button className="btn" onClick={() => onToggle(task.id)}>
        {task.done ? '↩ Undo' : '✓ Done'}
      </button>
      <button className="btn" onClick={() => onDelete(task.id)}>
        ✕
      </button>
    </div>
  );
}

function TaskList({ tasks, onToggle, onDelete }) {
  if (tasks.length === 0) {
    return (
      <div className="card box center">
        <p className="muted">No tasks here. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="list">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function HomePage() {
  const { tasks, addTask, toggleTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState('All');

  const filteredTasks = useMemo(() => {
    if (filter === 'Active') return tasks.filter(t => !t.done);
    if (filter === 'Done') return tasks.filter(t => t.done);
    return tasks;
  }, [tasks, filter]);

  const counts = useMemo(() => ({
    all: tasks.length,
    active: tasks.filter(t => !t.done).length,
    done: tasks.filter(t => t.done).length
  }), [tasks]);

  return (
    <div className="container wrap">
      <Hero />
      <TaskInput onAdd={addTask} />
      <FilterBar filter={filter} setFilter={setFilter} counts={counts} />
      <TaskList tasks={filteredTasks} onToggle={toggleTask} onDelete={deleteTask} />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
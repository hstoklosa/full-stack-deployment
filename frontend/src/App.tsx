import { useEffect, useState } from "react";
import "./App.css";

interface Todo {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// const API_URL = "http://localhost:8000";
const API_URL = "https://deploy.hstoklosa.dev/api";
const X_API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [todoInput, setTodoInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log("XDDD", X_API_URL);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/todos`);
      if (!response.ok) {
        throw new Error("Failed to fetch todos");
      }
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/todos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: todoInput.trim(),
          description: descriptionInput.trim() || null,
          completed: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create todo");
      }

      // Clear inputs
      setTodoInput("");
      setDescriptionInput("");

      // Refresh todos list
      await fetchTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create todo");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="app-container">
      <h1>Todo App</h1>

      <form
        onSubmit={handleSubmit}
        className="todo-form"
      >
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter todo title"
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            disabled={loading}
            required
          />
        </div>
        <div className="form-group">
          <textarea
            placeholder="Enter description (optional)"
            value={descriptionInput}
            onChange={(e) => setDescriptionInput(e.target.value)}
            disabled={loading}
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !todoInput.trim()}
        >
          {loading ? "Adding..." : "Add Todo"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <div className="todos-container">
        <h2>Todos ({todos.length})</h2>
        {loading && todos.length === 0 ? (
          <div className="loading">Loading todos...</div>
        ) : todos.length === 0 ? (
          <div className="empty-state">No todos yet. Add one above!</div>
        ) : (
          <ul className="todos-list">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? "completed" : ""}`}
              >
                <div className="todo-content">
                  <h3>{todo.title}</h3>
                  {todo.description && <p>{todo.description}</p>}
                  <div className="todo-meta">
                    <span className="todo-status">
                      {todo.completed ? "✓ Completed" : "○ Pending"}
                    </span>
                    <span className="todo-date">
                      Created: {formatDate(todo.created_at)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Modals / Statuses
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('Grade 3');
  const [scanConsoleLogs, setScanConsoleLogs] = useState([]);
  const [rawIcrText, setRawIcrText] = useState('');

  useEffect(() => {
    if (token) {
      fetchStudents();
    }
  }, [token]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // For each student, also fetch their latest answer score
        const studentsWithScores = await Promise.all(data.map(async (stu) => {
          try {
            const ansResponse = await fetch(`${API_BASE}/answers/student/${stu.studentId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (ansResponse.ok) {
              const answers = await ansResponse.json();
              return {
                ...stu,
                lastScore: answers.length > 0 ? answers[0].score : 'N/A',
                lastDate: answers.length > 0 ? new Date(answers[0].evaluatedAt).toLocaleDateString() : 'N/A'
              };
            }
          } catch (e) {
            console.error('Error fetching score for student', stu.studentId, e);
          }
          return { ...stu, lastScore: 'N/A', lastDate: 'N/A' };
        }));
        setStudents(studentsWithScores);
      } else {
        // If forbidden/unauthorized, logout
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (error) {
      setLoginError('Could not connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setStudents([]);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newStudentName, class: newStudentClass })
      });
      if (response.ok) {
        setNewStudentName('');
        setShowAddStudent(false);
        fetchStudents();
      }
    } catch (error) {
      console.error('Error adding student:', error);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Are you sure you want to remove this student?')) return;
    try {
      const response = await fetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchStudents();
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleSimulateScan = async () => {
    if (students.length === 0) {
      setScanConsoleLogs(prev => [...prev, `[ERROR] No students in roster to simulate scans for.`]);
      return;
    }

    const options = ['A', 'B', 'C', 'D', 'E'];
    const mockScans = students.map(student => {
      // Simulate random answers to compare against the key {"Q1":"A", "Q2":"B", "Q3":"C", "Q4":"D", "Q5":"A"}
      const randomAnswers = {
        Q1: options[Math.floor(Math.random() * 4)],
        Q2: options[Math.floor(Math.random() * 4)],
        Q3: options[Math.floor(Math.random() * 4)],
        Q4: options[Math.floor(Math.random() * 4)],
        Q5: options[Math.floor(Math.random() * 4)]
      };
      return {
        studentId: student.studentId,
        answers: randomAnswers
      };
    });

    const payload = {
      classId: newStudentClass,
      scans: mockScans
    };

    setScanConsoleLogs(prev => [...prev, `[INFO] Starting batch upload simulation for ${students.length} students...`]);
    
    try {
      const response = await fetch(`${API_BASE}/scan/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (response.ok) {
        setScanConsoleLogs(prev => [
          ...prev, 
          `[SUCCESS] Batch ${data.batchId} processed successfully!`,
          ...data.results.map(r => ` -> Student: ${r.studentName} (${r.studentId}) | Score: ${r.score} | Answers: ${JSON.stringify(r.answers)}`)
        ]);
        fetchStudents();
      } else {
        setScanConsoleLogs(prev => [...prev, `[ERROR] Upload failed: ${data.error}`]);
      }
    } catch (error) {
      setScanConsoleLogs(prev => [...prev, `[ERROR] Network error during simulation.`]);
    }
  };

  const handleCustomRawUpload = async () => {
    if (!rawIcrText.trim()) return;
    try {
      const parsed = JSON.parse(rawIcrText);
      setScanConsoleLogs(prev => [...prev, `[INFO] Ingesting custom RAW JSON upload...`]);
      const response = await fetch(`${API_BASE}/scan/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(parsed)
      });
      const data = await response.json();
      if (response.ok) {
        setScanConsoleLogs(prev => [
          ...prev,
          `[SUCCESS] Custom Batch Ingested successfully.`,
          ...data.results.map(r => ` -> Student: ${r.studentName} (${r.studentId}) | Score: ${r.score}`)
        ]);
        setRawIcrText('');
        fetchStudents();
      } else {
        setScanConsoleLogs(prev => [...prev, `[ERROR] Custom Ingest failed: ${data.error}`]);
      }
    } catch (e) {
      setScanConsoleLogs(prev => [...prev, `[ERROR] Invalid JSON structure. Please check and try again.`]);
    }
  };

  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="card auth-card">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div className="brand-logo">F</div>
            <div className="brand-title" style={{ fontSize: '1.5rem' }}>FLN Assessment Portal</div>
          </div>
          <div className="auth-header-text">
            <h2 className="auth-title">Teacher Sign In</h2>
            <p className="auth-subtitle">Use your classroom credentials to access your roster</p>
          </div>

          {loginError && <div className="alert alert-error">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="teacher@fln.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
          <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Demo User: <code style={{ color: 'var(--primary)' }}>teacher@fln.org</code> / <code style={{ color: 'var(--primary)' }}>password123</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">F</div>
          <h1 className="brand-title">FLN Assessment Portal</h1>
        </div>
        <div className="user-badge">
          <div className="user-info">
            <div className="user-email">{user?.email}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="page-container">
        <section className="card">
          <div className="dashboard-actions">
            <div>
              <h2 className="dash-title">Classroom Roster ({newStudentClass})</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Manage students, track current levels and scoring progress
              </p>
            </div>
            <div className="action-buttons">
              <button className="btn-secondary" onClick={() => setShowAddStudent(true)}>+ Add Student</button>
              <button className="btn-primary" onClick={() => setShowGenerateModal(true)}>Generate Worksheets</button>
            </div>
          </div>

          <div className="table-container">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Class/Grade</th>
                  <th>Current Level</th>
                  <th>Current Sublevel</th>
                  <th>Last Scored Score</th>
                  <th>Last Worksheet Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No students registered in this class. Click "+ Add Student" to start.
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student._id}>
                      <td><span className="student-badge-id">{student.studentId}</span></td>
                      <td style={{ fontWeight: '600' }}>{student.name}</td>
                      <td>{student.class}</td>
                      <td><span className="level-badge">L{student.level}</span></td>
                      <td>Sub {student.sublevel}</td>
                      <td>
                        {student.lastScore !== 'N/A' ? (
                          <span className="score-badge" style={{ borderColor: 'var(--success)' }}>
                            {student.lastScore}
                          </span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>{student.lastDate}</td>
                      <td>
                        <button
                          className="btn-danger-sm"
                          onClick={() => handleDeleteStudent(student._id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ICR Ingestion Simulator Console */}
        <section className="card Ingestion-panel" style={{ marginTop: '2rem' }}>
          <h2 className="dash-title" style={{ marginBottom: '1rem' }}>ICR Scanner Ingestion Simulator</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            Simulate dedicated scanner hardware feeding structured student response JSON into the assessment platform.
          </p>

          <div className="ingestion-grid">
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Simulation Actions</h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={handleSimulateScan}>
                  ⚡ Auto-Simulate Scanner Upload
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Upload Custom ICR JSON</label>
                <textarea
                  className="form-control"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', height: '120px', resize: 'none' }}
                  placeholder={`{\n  "classId": "${newStudentClass}",\n  "scans": [\n    {\n      "studentId": "${students[0]?.studentId || 'STU-XXXXXX'}",\n      "answers": { "Q1": "A", "Q2": "B", "Q3": "C", "Q4": "D", "Q5": "A" }\n    }\n  ]\n}`}
                  value={rawIcrText}
                  onChange={(e) => setRawIcrText(e.target.value)}
                />
              </div>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={handleCustomRawUpload}>
                Submit Raw Payload
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Scanner Console Logs</h3>
              <div className="console-box">
                {scanConsoleLogs.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>Console idle. Awaiting scan inputs...</span>
                ) : (
                  scanConsoleLogs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '0.25rem' }}>{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Add New Student</h3>
              <button className="modal-close" onClick={() => setShowAddStudent(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. John Doe"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Class / Grade</label>
                <select
                  className="form-control"
                  value={newStudentClass}
                  onChange={(e) => setNewStudentClass(e.target.value)}
                >
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                </select>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                💡 Note: Level and Sublevel default to Level 1 / Sublevel 1 and cannot be set manually per SRS guidelines.
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-logout" onClick={() => setShowAddStudent(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Add Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scaffolded Worksheet Generation Modal */}
      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--warning)' }}>Worksheet Generator</h3>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>&times;</button>
            </div>
            <div style={{ margin: '1rem 0', lineHeight: '1.6', fontSize: '0.95rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Feature Scheduled:</strong>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Worksheet generation is scaffolded and will become fully operational once curriculum content assets and the AI pipeline ship in the fast-follow update.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-primary" onClick={() => setShowGenerateModal(false)}>Understood</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

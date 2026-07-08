const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User, Student, Worksheet, ScanBatch, AnswerSubmission } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'fln-secret-key-123';

// Mock Answer Key for ICR evaluations (v0.1 does not generate worksheets, so we match against standard Q1-Q5)
const DEFAULT_ANSWER_KEY = {
  "Q1": "A",
  "Q2": "B",
  "Q3": "C",
  "Q4": "D",
  "Q5": "A"
};

// Middleware: Authenticate JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden. Invalid token.' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized. Token missing.' });
  }
};

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/students
router.get('/students', authenticateJWT, async (req, res) => {
  try {
    const students = await Student.find({ teacherId: req.user.userId });
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching students' });
  }
});

// POST /api/students
router.post('/students', authenticateJWT, async (req, res) => {
  const { name, class: className } = req.body;
  if (!name || !className) {
    return res.status(400).json({ error: 'Name and class are required' });
  }

  try {
    // Generate unique Student ID (e.g. STU-123456)
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const studentId = `STU-${randomDigits}`;

    const student = new Student({
      studentId,
      name,
      class: className,
      teacherId: req.user.userId,
      level: 1, // Default Level 1
      sublevel: 1 // Default Sublevel 1
    });

    await student.save();
    res.status(201).json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating student' });
  }
});

// DELETE /api/students/:id
router.delete('/students/:id', authenticateJWT, async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ _id: req.id || req.params.id, teacherId: req.user.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found or unauthorized' });
    }
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting student' });
  }
});

// POST /api/worksheets/generate-class
router.post('/worksheets/generate-class', authenticateJWT, (req, res) => {
  // Returns 501 / "not available yet" for v0.1 Teacher MVP
  res.status(501).json({
    message: 'Worksheet generation is not available yet. It will become functional once curriculum content and generator pipeline ship in the fast-follow update.'
  });
});

// GET /api/worksheets/student/:studentId
router.get('/worksheets/student/:studentId', authenticateJWT, async (req, res) => {
  try {
    const worksheets = await Worksheet.find({ studentId: req.params.studentId });
    res.json(worksheets);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching worksheets' });
  }
});

// POST /api/scan/upload
router.post('/scan/upload', authenticateJWT, async (req, res) => {
  const { classId, scans } = req.body;
  if (!classId || !scans || !Array.isArray(scans)) {
    return res.status(400).json({ error: 'classId and scans array are required' });
  }

  try {
    // Save ScanBatch
    const batch = new ScanBatch({
      classId,
      rawIcrJson: req.body,
      status: 'processed'
    });
    await batch.save();

    const results = [];

    // Process each scan item
    for (const scan of scans) {
      const { studentId, answers } = scan;
      if (!studentId || !answers) continue;

      // Verify student belongs to this teacher
      const student = await Student.findOne({ studentId, teacherId: req.user.userId });
      if (!student) continue;

      // Calculate score
      let correct = 0;
      let total = 0;
      
      // Compare answers with the DEFAULT_ANSWER_KEY
      for (const questionKey of Object.keys(DEFAULT_ANSWER_KEY)) {
        total++;
        if (answers[questionKey] === DEFAULT_ANSWER_KEY[questionKey]) {
          correct++;
        }
      }

      const scoreStr = `${correct}/${total}`;

      // Save AnswerSubmission
      const submission = new AnswerSubmission({
        studentId,
        icrAnswers: answers,
        score: scoreStr
      });
      await submission.save();

      results.push({
        studentId,
        studentName: student.name,
        score: scoreStr,
        answers
      });
    }

    res.status(200).json({
      message: 'Scan batch processed successfully',
      batchId: batch._id,
      results
    });

  } catch (error) {
    console.error('Scan processing error:', error);
    res.status(500).json({ error: 'Error processing scans' });
  }
});

// GET /api/scan/:id/status
router.get('/scan/:id/status', authenticateJWT, async (req, res) => {
  try {
    const batch = await ScanBatch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ error: 'Scan batch not found' });
    }
    res.json({ id: batch._id, status: batch.status, receivedAt: batch.receivedAt });
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving status' });
  }
});

// GET /api/answers/student/:studentId
router.get('/answers/student/:studentId', authenticateJWT, async (req, res) => {
  try {
    // Get submissions for a student (check authorization via Student mapping)
    const student = await Student.findOne({ studentId: req.params.studentId, teacherId: req.user.userId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found or unauthorized' });
    }

    const submissions = await AnswerSubmission.find({ studentId: req.params.studentId }).sort({ evaluatedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching answer submissions' });
  }
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fln';

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', routes);

// Base Route
app.get('/', (req, res) => {
  res.send('FLN Assessment Portal API running...');
});

// Seed default teacher if not exists
const seedDefaultTeacher = async () => {
  try {
    const defaultEmail = 'teacher@fln.org';
    const teacherCount = await User.countDocuments({ email: defaultEmail });
    if (teacherCount === 0) {
      const passwordHash = await bcrypt.hash('password123', 10);
      const defaultTeacher = new User({
        email: defaultEmail,
        passwordHash,
        role: 'teacher'
      });
      await defaultTeacher.save();
      console.log('Seeded default teacher user: teacher@fln.org / password123');
    }
  } catch (error) {
    console.error('Error seeding default teacher:', error);
  }
};

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedDefaultTeacher();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });

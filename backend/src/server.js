const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const { connectDB } = require('./config/database');
const models = require('./models');

const productRoutes = require('./routes/products');
const ingredientRoutes = require('./routes/ingredients');
const userRoutes = require('./routes/users');
const quizRoutes = require('./routes/quiz');
const recommendationRoutes = require('./routes/recommendations');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
connectDB();

// Routes
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MatchCare API is running with PostgreSQL',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MatchCare Backend running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
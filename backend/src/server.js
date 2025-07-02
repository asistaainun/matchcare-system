const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const models = require('./src/models');

const productRoutes = require('./src/routes/products');
const ingredientRoutes = require('./src/routes/ingredients');
const userRoutes = require('./src/routes/users');
const quizRoutes = require('./src/routes/quiz');
const recommendationRoutes = require('./src/routes/recommendations');
const guestRoutes = require('./src/routes/guest');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

// Security and optimization middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for images
app.use('/images', express.static(path.join(__dirname, 'public/images'), {
  maxAge: '1d', // Cache images for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set appropriate headers for images
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

// Image fallback middleware - serve placeholder if image not found
app.use('/images/products', (req, res, next) => {
  const fs = require('fs');
  const requestedPath = path.join(__dirname, 'public/images/products', req.path);
  
  fs.access(requestedPath, fs.constants.F_OK, (err) => {
    if (err) {
      // Image not found, serve placeholder
      const placeholderPath = path.join(__dirname, 'public/images/placeholders/product-placeholder.jpg');
      
      fs.access(placeholderPath, fs.constants.F_OK, (placeholderErr) => {
        if (placeholderErr) {
          // No placeholder available, return 404
          res.status(404).json({ error: 'Image not found' });
        } else {
          res.sendFile(placeholderPath);
        }
      });
    } else {
      next();
    }
  });
});

// API route prefixes
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/guest', guestRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'MatchCare API is running with PostgreSQL and image serving',
    database: 'PostgreSQL',
    imageSupport: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Image health check endpoint
app.get('/api/health/images', async (req, res) => {
  const fs = require('fs').promises;
  const imageDir = path.join(__dirname, 'public/images/products');
  
  try {
    const files = await fs.readdir(imageDir);
    const imageFiles = files.filter(file => 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.jpeg') || 
      file.toLowerCase().endsWith('.png') || 
      file.toLowerCase().endsWith('.webp')
    );
    
    res.json({
      status: 'OK',
      imageDirectory: imageDir,
      totalImages: imageFiles.length,
      sampleImages: imageFiles.slice(0, 5),
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp']
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Could not access image directory',
      error: error.message
    });
  }
});

// Database connection
connectDB();

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.originalUrl 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MatchCare Backend running on port ${PORT}`);
  console.log(`📊 Database: PostgreSQL`);
  console.log(`🖼️  Image serving: /images/products/`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
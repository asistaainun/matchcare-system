const fs = require('fs').promises;
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

class ImageMigrationService {
  constructor() {
    this.sourceDir = path.join(__dirname, '../../assets/images/product');
    this.targetDir = path.join(__dirname, '../public/images/products');
    this.placeholderDir = path.join(__dirname, '../public/images/placeholders');
    
    this.stats = {
      copied: 0,
      skipped: 0,
      errors: 0,
      totalSize: 0
    };
  }

  async migrate() {
    try {
      console.log('🚀 Starting image migration...');
      console.log(`📂 Source: ${this.sourceDir}`);
      console.log(`📂 Target: ${this.targetDir}`);

      // Create target directories
      await this.ensureDirectories();

      // Check source directory
      const sourceExists = await this.checkSourceDirectory();
      if (!sourceExists) {
        console.log('⚠️  Source directory not found. Creating example structure...');
        await this.createExampleStructure();
        return;
      }

      // Get list of images to migrate
      const images = await this.getImageList();
      console.log(`📦 Found ${images.length} images to migrate`);

      if (images.length === 0) {
        console.log('📦 No images found in source directory');
        await this.createPlaceholders();
        return;
      }

      // Migrate images
      await this.migrateImages(images);

      // Create placeholders
      await this.createPlaceholders();

      // Print summary
      this.printSummary();

      console.log('🎉 Image migration completed!');

    } catch (error) {
      console.error('❌ Error during image migration:', error);
      throw error;
    }
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.targetDir, { recursive: true });
      await fs.mkdir(this.placeholderDir, { recursive: true });
      console.log('✅ Target directories created');
    } catch (error) {
      console.error('Error creating directories:', error);
      throw error;
    }
  }

  async checkSourceDirectory() {
    try {
      await fs.access(this.sourceDir);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getImageList() {
    try {
      const files = await fs.readdir(this.sourceDir);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      });
    } catch (error) {
      console.error('Error reading source directory:', error);
      return [];
    }
  }

  async migrateImages(images) {
    console.log('\n📋 Starting image migration...');
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      await this.migrateImage(image, i + 1, images.length);
    }
  }

  async migrateImage(imageName, current, total) {
    const sourcePath = path.join(this.sourceDir, imageName);
    const targetPath = path.join(this.targetDir, imageName);

    try {
      // Check if target already exists
      try {
        await fs.access(targetPath);
        console.log(`⏭️  [${current}/${total}] Skipped: ${imageName} (already exists)`);
        this.stats.skipped++;
        return;
      } catch (error) {
        // File doesn't exist, proceed with copy
      }

      // Get source file stats
      const sourceStats = await fs.stat(sourcePath);
      
      // Copy file using streams for better performance
      await pipeline(
        createReadStream(sourcePath),
        createWriteStream(targetPath)
      );

      // Verify copy was successful
      const targetStats = await fs.stat(targetPath);
      if (targetStats.size === sourceStats.size) {
        console.log(`✅ [${current}/${total}] Copied: ${imageName} (${this.formatFileSize(sourceStats.size)})`);
        this.stats.copied++;
        this.stats.totalSize += sourceStats.size;
      } else {
        throw new Error('File size mismatch after copy');
      }

    } catch (error) {
      console.error(`❌ [${current}/${total}] Error copying ${imageName}:`, error.message);
      this.stats.errors++;
    }
  }

  async createPlaceholders() {
    console.log('\n🖼️  Creating placeholder images...');
    
    const placeholders = [
      'product-placeholder.jpg',
      'no-image.jpg',
      'loading-placeholder.jpg'
    ];

    for (const placeholder of placeholders) {
      await this.createPlaceholderImage(placeholder);
    }
  }

  async createPlaceholderImage(filename) {
    const targetPath = path.join(this.placeholderDir, filename);
    
    try {
      // Check if placeholder already exists
      await fs.access(targetPath);
      console.log(`⏭️  Placeholder exists: ${filename}`);
      return;
    } catch (error) {
      // Create a simple SVG placeholder
      const svgContent = this.generatePlaceholderSVG(filename);
      await fs.writeFile(targetPath.replace('.jpg', '.svg'), svgContent);
      console.log(`✅ Created placeholder: ${filename.replace('.jpg', '.svg')}`);
    }
  }

  generatePlaceholderSVG(filename) {
    const size = 400;
    const text = filename.includes('product') ? 'Product Image' : 
                 filename.includes('no-image') ? 'No Image' : 'Loading...';
    
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect width="80%" height="80%" x="10%" y="10%" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2" rx="8"/>
      <circle cx="50%" cy="35%" r="8%" fill="#9ca3af"/>
      <polygon points="40%,55% 45%,45% 55%,45% 60%,55% 65%,65% 35%,65%" fill="#9ca3af"/>
      <text x="50%" y="80%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#6b7280">
        ${text}
      </text>
    </svg>`;
  }

  async createExampleStructure() {
    console.log('\n📁 Creating example directory structure...');
    
    // Create source directory
    await fs.mkdir(this.sourceDir, { recursive: true });
    
    // Create example README
    const readmeContent = `# MatchCare Images

## Directory Structure
Place your product images in this directory with the following naming convention:

### Recommended File Naming:
- product-id-1.jpg
- brand-product-name.jpg
- clean-descriptive-names.jpg

### Supported Formats:
- .jpg / .jpeg (recommended)
- .png
- .webp

### File Size Recommendations:
- Maximum: 2MB per image
- Optimal: 500KB - 1MB
- Dimensions: 800x800px (square) or 4:3 ratio

### Example Files:
Copy your product images here, then run:
\`npm run migrate-images\`

The migration script will:
1. Copy images to backend/public/images/products/
2. Create necessary placeholder images
3. Optimize file organization
4. Generate migration report

## Notes:
- Images will be served at: http://localhost:5000/images/products/filename.jpg
- Placeholder images are automatically generated for missing files
- The system supports multiple images per product
`;

    await fs.writeFile(path.join(this.sourceDir, 'README.md'), readmeContent);
    console.log(`✅ Created: ${path.join(this.sourceDir, 'README.md')}`);
    console.log('\n📋 Instructions:');
    console.log('1. Copy your product images to:', this.sourceDir);
    console.log('2. Run: npm run migrate-images');
    console.log('3. Start your application');
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  printSummary() {
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Copied: ${this.stats.copied} images`);
    console.log(`   ⏭️  Skipped: ${this.stats.skipped} images`);
    console.log(`   ❌ Errors: ${this.stats.errors} images`);
    console.log(`   📦 Total size: ${this.formatFileSize(this.stats.totalSize)}`);
    
    if (this.stats.errors > 0) {
      console.log('\n⚠️  Some images had errors. Check logs above for details.');
    }
    
    if (this.stats.copied > 0) {
      console.log('\n🎯 Next steps:');
      console.log('1. Start your backend server: npm run dev');
      console.log('2. Check images at: http://localhost:5000/api/health/images');
      console.log('3. Test image serving: http://localhost:5000/images/products/[filename]');
    }
  }

  // Cleanup method to remove empty source directory if needed
  async cleanup() {
    try {
      const files = await fs.readdir(this.sourceDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      });

      if (imageFiles.length === 0) {
        console.log('\n🧹 Source directory is now empty. You can safely delete:');
        console.log(`   ${this.sourceDir}`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run migration if called directly
async function runMigration() {
  const migrator = new ImageMigrationService();
  
  try {
    await migrator.migrate();
    await migrator.cleanup();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = ImageMigrationService;
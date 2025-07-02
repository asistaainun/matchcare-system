const { connectDB } = require('../../src/config/database');
const { User, UserProfile } = require('../../src/models');
require('dotenv').config();

const sampleUsers = [
  {
    email: 'demo@matchcare.com',
    password: 'password123',
    firstName: 'Demo',
    lastName: 'User',
    profile: {
      skinType: 'combination',
      skinConcerns: ['acne', 'oiliness', 'dark_spots'],
      knownSensitivities: ['fragrance'],
      routineComplexity: 'moderate',
      budgetRange: { min: 15, max: 40 }
    }
  },
  {
    email: 'sarah@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Johnson',
    profile: {
      skinType: 'dry',
      skinConcerns: ['dryness', 'fine_lines', 'sensitivity'],
      knownSensitivities: ['alcohol', 'fragrance'],
      routineComplexity: 'extensive',
      budgetRange: { min: 40, max: 80 }
    }
  },
  {
    email: 'mike@example.com',
    password: 'password123',
    firstName: 'Mike',
    lastName: 'Chen',
    profile: {
      skinType: 'oily',
      skinConcerns: ['acne', 'pores', 'oiliness'],
      knownSensitivities: ['none'],
      routineComplexity: 'minimal',
      budgetRange: { min: 5, max: 25 }
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    console.log('✅ PostgreSQL connected');

    // Clear existing sample data
    const emails = sampleUsers.map(u => u.email);
    await User.destroy({ where: { email: emails }, force: true });
    console.log('🧹 Cleared existing sample data');

    // Create sample users
    for (const userData of sampleUsers) {
      const { profile, ...userInfo } = userData;
      
      // Create user
      const user = await User.create(userInfo);
      console.log(`✅ Created user: ${user.email}`);

      // Create user profile
      const userProfile = await UserProfile.create({
        userId: user.id,
        ...profile
      });
      
      // Calculate profile completeness
      userProfile.calculateCompleteness();
      await userProfile.save();
      
      // Update user profile completion status
      await user.update({
        isProfileComplete: userProfile.profileCompleteness >= 80
      });
      
      console.log(`✅ Created profile for: ${user.email} (${userProfile.profileCompleteness}% complete)`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('👤 Sample users created:');
    sampleUsers.forEach(user => {
      console.log(`   - ${user.email} (password: ${user.password})`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
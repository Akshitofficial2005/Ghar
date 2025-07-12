const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: process.env.ADMIN_EMAIL 
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
      // Update the existing admin
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      
      console.log('Admin user updated successfully!');
    } else {
      // Create new admin user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

      const adminUser = new User({
        name: 'Admin User',
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        phone: '+919907002817',
        role: 'admin',
        isVerified: true
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
    }

    console.log(`Admin Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`Admin Password: ${process.env.ADMIN_PASSWORD}`);
    console.log('You can now login with these credentials');

    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding admin:', error);
    mongoose.disconnect();
  }
};

seedAdmin();

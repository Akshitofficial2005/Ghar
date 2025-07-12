const bcrypt = require('bcryptjs');
require('dotenv').config();

const generateHashedPassword = async () => {
  try {
    const password = process.env.ADMIN_PASSWORD || 'akshit@Mayank2003';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    console.log('Original Password:', password);
    console.log('Hashed Password:', hashedPassword);
    console.log('\nCopy this hashed password to users.json');
  } catch (error) {
    console.error('Error generating hash:', error);
  }
};

generateHashedPassword();

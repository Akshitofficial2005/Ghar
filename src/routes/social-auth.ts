import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google Login
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    // Mock user for testing without MongoDB
    const user = {
      _id: '507f1f77bcf86cd799439011',
      name: payload.name || 'Google User',
      email: payload.email || '',
      avatar: payload.picture,
      isVerified: true,
      phone: '0000000000',
    };

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({ user, token });
  } catch (error) {
    return res.status(500).json({ message: 'Google login failed' });
  }
});

// Facebook Login
router.post('/facebook', async (req, res) => {
  try {
    const { accessToken, userID, name, email } = req.body;

    // Verify Facebook token
    const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
    const fbUser = await response.json() as { id: string; name: string; email: string };

    if (fbUser.id !== userID) {
      return res.status(400).json({ message: 'Invalid Facebook token' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name: name || 'Facebook User',
        email: email || '',
        isVerified: true,
        password: Math.random().toString(36).slice(-8),
        phone: '0000000000', // Default phone
      });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({ user, token });
  } catch (error) {
    return res.status(500).json({ message: 'Facebook login failed' });
  }
});

export default router;
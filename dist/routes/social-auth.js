"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const User_1 = require("../models/User");
const router = express_1.default.Router();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
        const user = {
            _id: '507f1f77bcf86cd799439011',
            name: payload.name || 'Google User',
            email: payload.email || '',
            avatar: payload.picture,
            isVerified: true,
            phone: '0000000000',
        };
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ user, token });
    }
    catch (error) {
        return res.status(500).json({ message: 'Google login failed' });
    }
});
router.post('/facebook', async (req, res) => {
    try {
        const { accessToken, userID, name, email } = req.body;
        const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`);
        const fbUser = await response.json();
        if (fbUser.id !== userID) {
            return res.status(400).json({ message: 'Invalid Facebook token' });
        }
        let user = await User_1.User.findOne({ email });
        if (!user) {
            user = new User_1.User({
                name: name || 'Facebook User',
                email: email || '',
                isVerified: true,
                password: Math.random().toString(36).slice(-8),
                phone: '0000000000',
            });
            await user.save();
        }
        const token = jsonwebtoken_1.default.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        return res.json({ user, token });
    }
    catch (error) {
        return res.status(500).json({ message: 'Facebook login failed' });
    }
});
exports.default = router;
//# sourceMappingURL=social-auth.js.map
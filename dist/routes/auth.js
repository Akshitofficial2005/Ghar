"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const express_validator_1 = require("express-validator");
const User_1 = require("../models/User");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
const registerValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('phone')
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['user', 'owner'])
        .withMessage('Role must be either user or owner'),
];
const loginValidation = [
    (0, express_validator_1.body)('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('Password is required'),
];
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET || 'fallback-secret';
    const payload = { id: userId };
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '7d' });
};
router.post('/register', registerValidation, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        const { name, email, password, phone, role = 'user' } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            throw (0, errorHandler_1.createError)('User with this email already exists', 400);
        }
        const existingPhone = await User_1.User.findOne({ phone });
        if (existingPhone) {
            throw (0, errorHandler_1.createError)('User with this phone number already exists', 400);
        }
        const user = new User_1.User({
            name,
            email,
            password,
            phone,
            role,
            verificationToken: crypto_1.default.randomBytes(32).toString('hex'),
        });
        await user.save();
        const token = generateToken(user._id.toString());
        return res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                token,
                user,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/login', loginValidation, async (req, res, next) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array(),
            });
        }
        const { email, password } = req.body;
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            throw (0, errorHandler_1.createError)('Invalid email or password', 401);
        }
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw (0, errorHandler_1.createError)('Invalid email or password', 401);
        }
        const token = generateToken(user._id.toString());
        const userResponse = user.toJSON();
        return res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                token,
                user: userResponse,
            },
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw (0, errorHandler_1.createError)('Email is required', 400);
        }
        const user = await User_1.User.findOne({ email });
        if (!user) {
            return res.json({
                status: 'success',
                message: 'If an account with that email exists, a password reset link has been sent.',
            });
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000);
        await user.save();
        return res.json({
            status: 'success',
            message: 'Password reset link sent to your email',
            resetToken: resetToken,
        });
    }
    catch (error) {
        return next(error);
    }
});
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            throw (0, errorHandler_1.createError)('Token and password are required', 400);
        }
        if (password.length < 6) {
            throw (0, errorHandler_1.createError)('Password must be at least 6 characters long', 400);
        }
        const user = await User_1.User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            throw (0, errorHandler_1.createError)('Invalid or expired reset token', 400);
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        return res.json({
            status: 'success',
            message: 'Password reset successful',
        });
    }
    catch (error) {
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
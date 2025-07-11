"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/profile', auth_1.authenticate, async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.user._id);
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        res.json({
            status: 'success',
            data: { user },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/profile', auth_1.authenticate, async (req, res, next) => {
    try {
        const { name, phone, avatar } = req.body;
        const user = await User_1.User.findById(req.user._id);
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        if (name)
            user.name = name;
        if (phone)
            user.phone = phone;
        if (avatar)
            user.avatar = avatar;
        await user.save();
        res.json({
            status: 'success',
            message: 'Profile updated successfully',
            data: { user },
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/change-password', auth_1.authenticate, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            throw (0, errorHandler_1.createError)('Current password and new password are required', 400);
        }
        if (newPassword.length < 6) {
            throw (0, errorHandler_1.createError)('New password must be at least 6 characters long', 400);
        }
        const user = await User_1.User.findById(req.user._id).select('+password');
        if (!user) {
            throw (0, errorHandler_1.createError)('User not found', 404);
        }
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            throw (0, errorHandler_1.createError)('Current password is incorrect', 400);
        }
        user.password = newPassword;
        await user.save();
        res.json({
            status: 'success',
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=user.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const errorHandler_1 = require("./errorHandler");
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            throw (0, errorHandler_1.createError)('Access denied. No token provided.', 401);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.User.findById(decoded.id);
        if (!user) {
            throw (0, errorHandler_1.createError)('Invalid token.', 401);
        }
        req.user = user;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw (0, errorHandler_1.createError)('Access denied. User not authenticated.', 401);
        }
        if (!roles.includes(req.user.role)) {
            throw (0, errorHandler_1.createError)('Access denied. Insufficient permissions.', 403);
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.js.map
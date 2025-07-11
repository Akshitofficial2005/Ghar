"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = exports.sanitizeString = exports.isValidObjectId = exports.calculateDaysBetween = exports.formatDate = exports.formatCurrency = exports.generateBookingId = exports.generateRandomString = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateRandomString = (length = 32) => {
    return crypto_1.default.randomBytes(length).toString('hex');
};
exports.generateRandomString = generateRandomString;
const generateBookingId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto_1.default.randomBytes(4).toString('hex');
    return `BK${timestamp}${randomStr}`.toUpperCase();
};
exports.generateBookingId = generateBookingId;
const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
};
exports.formatDate = formatDate;
const calculateDaysBetween = (startDate, endDate) => {
    const timeDifference = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
};
exports.calculateDaysBetween = calculateDaysBetween;
const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};
exports.isValidObjectId = isValidObjectId;
const sanitizeString = (str) => {
    return str.trim().replace(/[<>]/g, '');
};
exports.sanitizeString = sanitizeString;
const generateSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.generateSlug = generateSlug;
//# sourceMappingURL=helpers.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupChatWebSocket = void 0;
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const connections = new Map();
const setupChatWebSocket = (server) => {
    const wss = new ws_1.default.Server({ server, path: '/chat' });
    wss.on('connection', (ws, req) => {
        const token = new URL(req.url, `http://${req.headers.host}`).searchParams.get('token');
        if (!token) {
            ws.close(1008, 'No token provided');
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId;
            connections.set(userId, ws);
            console.log(`User ${userId} connected to chat`);
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    const { recipientId, message: text, type = 'text' } = message;
                    const chatMessage = {
                        id: Date.now().toString(),
                        senderId: userId,
                        senderName: 'User',
                        message: text,
                        timestamp: new Date(),
                        type
                    };
                    const recipientWs = connections.get(recipientId);
                    if (recipientWs && recipientWs.readyState === ws_1.default.OPEN) {
                        recipientWs.send(JSON.stringify(chatMessage));
                    }
                    ws.send(JSON.stringify(chatMessage));
                }
                catch (error) {
                    console.error('Chat message error:', error);
                }
            });
            ws.on('close', () => {
                connections.delete(userId);
                console.log(`User ${userId} disconnected from chat`);
            });
        }
        catch (error) {
            ws.close(1008, 'Invalid token');
        }
    });
};
exports.setupChatWebSocket = setupChatWebSocket;
router.get('/history/:userId', auth_1.authenticate, async (req, res) => {
    try {
        res.json({ messages: [] });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to get chat history' });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map
import express from 'express';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Store active connections
const connections = new Map<string, WebSocket>();

// WebSocket server setup
export const setupChatWebSocket = (server: any) => {
  const wss = new WebSocket.Server({ server, path: '/chat' });

  wss.on('connection', (ws: WebSocket, req) => {
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'No token provided');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const userId = decoded.userId;
      
      connections.set(userId, ws);
      console.log(`User ${userId} connected to chat`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          const { recipientId, message: text, type = 'text' } = message;

          // Save message to database (implement Message model)
          const chatMessage = {
            id: Date.now().toString(),
            senderId: userId,
            senderName: 'User', // Get from user data
            message: text,
            timestamp: new Date(),
            type
          };

          // Send to recipient if online
          const recipientWs = connections.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify(chatMessage));
          }

          // Echo back to sender
          ws.send(JSON.stringify(chatMessage));
        } catch (error) {
          console.error('Chat message error:', error);
        }
      });

      ws.on('close', () => {
        connections.delete(userId);
        console.log(`User ${userId} disconnected from chat`);
      });

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  });
};

// Get chat history
router.get('/history/:userId', authenticate, async (req, res) => {
  try {
    // Implement chat history retrieval
    res.json({ messages: [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chat history' });
  }
});

export default router;
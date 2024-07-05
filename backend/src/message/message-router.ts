import express from 'express';
import { createMessage, getMessages } from './message-contoller';

const router = express.Router();

router.post('/messages', createMessage);
router.get('/messages', getMessages);

export default router;

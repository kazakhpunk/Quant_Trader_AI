import { saveMessage, getAllMessages } from './message-service';

export const createMessage = async (req, res) => {
  try {
    const { role, content } = req.body;
    const newMessage = await saveMessage(role, content);
    res.status(201).json(newMessage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await getAllMessages();
    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

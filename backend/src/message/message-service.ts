import Message from './dtos/messageSchema';

export const saveMessage = async (role, content) => {
  const message = new Message({ role, content });
  return await message.save();
};

export const getAllMessages = async () => {
  return await Message.find().sort({ timestamp: 1 }); // Sort by timestamp ascending
};

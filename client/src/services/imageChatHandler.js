// Encapsulates image logic: upload, fetch, store, retrieve, delete
// Uses API helpers from api.js
import { uploadChatImage, getChatImage, getChatImageById, getAllChatImages } from './api';

// Upload image to a chat (persist in MongoDB)
export async function uploadImage(chatId, file) {
  if (!chatId || !file) throw new Error('chatId and file are required');
  return uploadChatImage(chatId, file);
}

// Fetch image for a chat (latest) or by imageId; returns a Blob URL
export async function fetchImage(chatId, imageId) {
  if (!chatId) throw new Error('chatId is required');
  try {
    let res;
    if (imageId) {
      res = await getChatImageById(chatId, imageId);
    } else {
      res = await getChatImage(chatId);
    }
    const blob = res.data;
    if (!blob || (blob.size !== undefined && blob.size === 0)) return null;
    return URL.createObjectURL(blob);
  } catch (err) {
    // Likely 404 if no image
    return null;
  }
}

// Fetch metadata for all images for a chat
export async function fetchAllImages(chatId) {
  if (!chatId) throw new Error('chatId is required');
  try {
    const res = await getAllChatImages(chatId);
    return res.data.images || [];
  } catch (err) {
    return [];
  }
}

// Fetch a single image by imageId
export async function fetchImageById(chatId, imageId) {
  if (!chatId || !imageId) throw new Error('chatId and imageId are required');
  try {
    const res = await getChatImageById(chatId, imageId);
    const blob = res.data;
    if (!blob || (blob.size !== undefined && blob.size === 0)) return null;
    return URL.createObjectURL(blob);
  } catch (err) {
    return null;
  }
}

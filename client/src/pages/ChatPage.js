import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChats, createChat, predict, deleteChat, updateChat, transcribeAudio, getAnswer, predictExpert, predictExpertWithImage, getExpertAnalysisStatus } from '../services/api';
import { uploadImage as uploadChatImageSvc, fetchImage as fetchChatImage, fetchAllImages, fetchImageById } from '../services/imageChatHandler';
import { useTheme } from '../contexts/ThemeContext';
import styles from './ChatPage.module.css';
import Sidebar from '../components/Chat/Sidebar';
import ChatArea from '../components/Chat/ChatArea';
import ConfirmationModal from '../components/common/ConfirmationModal';

const ChatPage = () => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messageAreaRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioFileInputRef = React.createRef();
  const imageFileInputRef = React.createRef();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal states moved from Sidebar
  const [showClearChatsModal, setShowClearChatsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Expert Analysis state
  const [expertAnalysisRemaining, setExpertAnalysisRemaining] = useState(2);
  
  // User moderation state
  const [userStatus, setUserStatus] = useState({ isBlocked: false, isTimedOut: false, reason: '', timeoutUntil: null });


  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (!storedUserInfo) {
      navigate('/login');
    } else {
      const parsedUserInfo = JSON.parse(storedUserInfo);
      setUserInfo(parsedUserInfo);
      fetchChats();
      fetchExpertAnalysisStatus();
      setCurrentChat(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  }, [currentChat, isLoading, currentChat?.messages]);


  useEffect(() => {
    const loadPersistedImages = async () => {
      if (currentChat && currentChat._id) {
        // Do not revoke the local preview here; it may still be in use by UI until send completes
        try {
          const images = await fetchAllImages(currentChat._id);
          const urlPromises = images.map(img => fetchImageById(currentChat._id, img._id));
          const urls = await Promise.all(urlPromises);
          
          // Match images to __image__ placeholders in chronological order
          let imageIdx = 0;
          const enhanced = {
            ...currentChat,
            messages: currentChat.messages.map((m) => {
              if (m.sender === 'user' && m.content === '__image__' && !m.imageUrl && urls[imageIdx]) {
                const msgWithUrl = { ...m, imageUrl: urls[imageIdx] };
                imageIdx++;
                return msgWithUrl;
              }
              return m;
            })
          };
          setCurrentChat(enhanced);
          
          // Only clear preview after successfully loading persisted images
          // Use setTimeout to ensure state update completes first
          setTimeout(() => {
            setImagePreviewUrl(null);
            setSelectedImage(null);
          }, 100);
        } catch (error) {
          console.error('Failed to load images:', error);
          // Don't clear preview on error - keep blob URL alive
        }
      } else {
        // Only clear when switching to no chat (not during message send)
        setImagePreviewUrl(null);
        setSelectedImage(null);
      }
    };
    loadPersistedImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat?._id]);

  useEffect(() => {
    // Clean up the object URL on component unmount
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Safety check to ensure recording state is properly reset
  useEffect(() => {
    if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
      setIsRecording(false);
    }
  }, [isRecording]);

  const fetchChats = async () => {
    try {
      const response = await getChats();
      const reversedChats = response.data.reverse();
      setChats(reversedChats);
      // Clear any previous moderation status on successful fetch
      setUserStatus({ isBlocked: false, isTimedOut: false, reason: '', timeoutUntil: null });
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      // Check if user is blocked or timed out
      if (error.response?.status === 403) {
        const data = error.response.data;
        if (data.isBlocked) {
          setUserStatus({ isBlocked: true, isTimedOut: false, reason: data.reason, timeoutUntil: null });
        } else if (data.isTimedOut) {
          setUserStatus({ isBlocked: false, isTimedOut: true, reason: data.reason, timeoutUntil: data.timeoutUntil });
        }
      }
    }
  };

  const fetchExpertAnalysisStatus = async () => {
    try {
      const response = await getExpertAnalysisStatus();
      setExpertAnalysisRemaining(response.data.remaining);
    } catch (error) {
      console.error('Failed to fetch expert analysis status:', error);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      // Ensure recording state is reset
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);

          try {
            setIsTranscribing(true);
            const response = await transcribeAudio(audioFile);
            setMessage(response.data.text);
          } catch (error) {
            console.error('Error transcribing audio:', error);
            alert('Failed to transcribe audio. Please try again.');
          } finally {
            setIsTranscribing(false);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access the microphone. Please check your browser permissions.');
        setIsRecording(false);
      }
    }
  };

  const handleAudioFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSelectedImage(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      try {
        setIsTranscribing(true);
        const response = await transcribeAudio(file);
        setMessage(response.data.text);
      } catch (error) {
        console.error('Error transcribing audio:', error);
        alert('Failed to transcribe audio. Please try again.');
      } finally {
        setIsTranscribing(false);
        setSelectedFile(null);
      }
    }
  };

  // Only remove image from DB when user explicitly clears attachment
  const handleClearAttachment = async () => {
    setSelectedFile(null);
    setSelectedImage(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
  };

  // Do NOT call removeChatImageSvc anywhere else. Images are only deleted on explicit clear.

  const handleImageFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setSelectedFile(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);
      // Only show local preview for now; upload and backend fetch will be handled in handleSendMessage
    }
  };

  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setIsAttachmentMenuOpen(false);
      
      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access the camera. Please check your browser permissions.');
    }
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setSelectedImage(file);
          setSelectedFile(null);
          
          if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
          }
          
          const previewUrl = URL.createObjectURL(file);
          setImagePreviewUrl(previewUrl);
          
          // Close camera after capture
          handleCloseCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleExpertClick = () => {
    setMessage('@expert ');
    // Focus the input field after inserting @expert
    setTimeout(() => {
      const inputField = document.querySelector(`.${styles.inputField}`);
      if (inputField) {
        inputField.focus();
      }
    }, 0);
  };

  const handleSuggestedQuestionClick = (question) => {
    setMessage(question);
    // Focus the input field after inserting the question
    setTimeout(() => {
      const inputField = document.querySelector(`.${styles.inputField}`);
      if (inputField) {
        inputField.focus();
      }
    }, 0);
  };

  const handleSendMessage = async () => {
    // Snapshot attachment state BEFORE clearing, so UI can show immediately
    const localImageUrl = imagePreviewUrl || null;
    const localSelectedImage = selectedImage || null;
    const hasImage = Boolean(localSelectedImage || localImageUrl);

    // Clear input but DON'T clear image preview yet - keep it valid until replaced
    setMessage('');
    setSelectedFile(null);
    // Don't clear imagePreviewUrl or selectedImage yet - keep blob URL alive

    // Only allow sending if there is non-empty message text
    if (!message.trim() || isLoading) return;

    const currentMessage = message;
    
    // Check if this is an expert analysis request
    const isExpertMode = currentMessage.trim().startsWith('@expert');
    const actualQuestion = isExpertMode 
      ? currentMessage.trim().substring(7).trim() // Remove '@expert' prefix
      : currentMessage;
    
    // Don't proceed if expert mode but no actual question
    if (isExpertMode && !actualQuestion) {
      setMessage(currentMessage); // Restore the message
      return;
    }
    
    // Check expert analysis limit before sending
    if (isExpertMode && expertAnalysisRemaining <= 0) {
      alert('Daily expert analysis limit reached. You can use this feature 2 times per day.');
      setMessage(currentMessage); // Restore the message
      return;
    }
    
    // Decrement immediately when sending expert analysis
    if (isExpertMode) {
      setExpertAnalysisRemaining(prev => Math.max(0, prev - 1));
    }
    
    setIsLoading(true);

    // Store only the actual question without @expert prefix
    const userMessage = actualQuestion.trim() ? {
      sender: 'user',
      content: actualQuestion,
      timestamp: new Date().toISOString(),
    } : null;

    let activeChat = currentChat;
    let newChatCreated = false;
    const imagePlaceholderMsg = hasImage
      ? {
          sender: 'user',
          content: '__image__',
          timestamp: new Date().toISOString(),
        }
      : null;
    let replacedWithPersisted = false;

    try {
      // If there is no active chat, create one.
      if (!activeChat) {
        const initialMessages = [];
        if (userMessage) initialMessages.push(userMessage);
        if (imagePlaceholderMsg) initialMessages.push(imagePlaceholderMsg);
        
        const chatTitle = actualQuestion.trim() 
          ? actualQuestion.substring(0, 30) 
          : 'Image Chat';
          
        const newChatResponse = await createChat({
          title: chatTitle,
          messages: initialMessages,
        });
        activeChat = newChatResponse.data;
        // Enhance UI with imageUrl for the placeholder, if any
        if (imagePlaceholderMsg && localImageUrl) {
          const enhanced = {
            ...activeChat,
            messages: activeChat.messages.map(m =>
              m.sender === 'user' && m.content === '__image__'
                ? { ...m, imageUrl: localImageUrl }
                : m
            ),
          };
          setChats(prevChats => [enhanced, ...prevChats]);
          setCurrentChat(enhanced);
        } else {
          setChats(prevChats => [activeChat, ...prevChats]);
          setCurrentChat(activeChat);
        }
        newChatCreated = true;
      } else {
        // If a chat is active, update it with the new user message immediately.
        const updatedMessages = [...activeChat.messages];
        if (userMessage) updatedMessages.push(userMessage);
        if (imagePlaceholderMsg) updatedMessages.push(imagePlaceholderMsg);
        
        // Enhance UI with image bubble immediately
        const enhanced = imagePlaceholderMsg && localImageUrl
          ? {
              ...activeChat,
              messages: updatedMessages.map(m =>
                m.sender === 'user' && m.content === '__image__' && !m.imageUrl
                  ? { ...m, imageUrl: localImageUrl }
                  : m
              ),
            }
          : { ...activeChat, messages: updatedMessages };
        setCurrentChat(enhanced);
      }
      // If a new image is selected and not yet persisted (no chat before), upload now
      let botResponse;
      let persistedUrl = null;
      if (hasImage && activeChat && activeChat._id) {
        try {
          if (localSelectedImage) {
            await uploadChatImageSvc(activeChat._id, localSelectedImage);
            // Don't fetch persisted image yet; do it after bot answer
          }

          // Use expert endpoint if in expert mode
          if (isExpertMode) {
            botResponse = await predictExpertWithImage(actualQuestion, activeChat._id);
          } else {
            botResponse = await getAnswer(currentMessage, activeChat._id);
          }
          
          // Now fetch persisted image URL and update chat UI
          if (localSelectedImage) {
            persistedUrl = await fetchChatImage(activeChat._id);
            if (persistedUrl) {
              setCurrentChat(prev => {
                if (!prev) return prev;
                const msgs = [...prev.messages];
                for (let i = msgs.length - 1; i >= 0; i--) {
                  if (msgs[i].sender === 'user' && msgs[i].content === '__image__') {
                    msgs[i] = { ...msgs[i], imageUrl: persistedUrl };
                    break;
                  }
                }
                return { ...prev, messages: msgs };
              });
              replacedWithPersisted = true;
            }
          }
        } catch (err) {
          console.error('Image-based prediction failed:', err);
          if (err?.response) {
            console.error('Backend error response:', err.response.data);
            console.error('Backend error status:', err.response.status);
            console.error('Backend error headers:', err.response.headers);
          }
        if (err?.response?.status === 404 || (err.message && err.message.includes('No persisted image'))) {
            console.warn('Falling back to text-only prediction.');
            // Use expert endpoint if in expert mode
            if (isExpertMode) {
              botResponse = await predictExpert(actualQuestion, activeChat._id);
            } else {
              botResponse = await predict(currentMessage, activeChat._id);
            }
          } else if (err?.response?.status === 429) {
            // Expert analysis limit reached - restore count since request failed
            if (isExpertMode) {
              setExpertAnalysisRemaining(prev => prev + 1);
            }
            alert(err.response.data.message || 'Daily expert analysis limit reached.');
            setIsLoading(false);
            setMessage(currentMessage); // Restore message
            return;
          } else {
            throw err;
          }
        }
      } else {
        // Use expert endpoint if in expert mode
        if (isExpertMode) {
          botResponse = await predictExpert(actualQuestion, activeChat._id);
        } else {
          botResponse = await predict(currentMessage, activeChat._id);
        }
      }
      const botMessage = {
        sender: 'bot',
        content: botResponse.data.answer,
        timestamp: new Date().toISOString(),
      };

      // If a new chat was created, its messages are already up-to-date with the user message.
      // Otherwise, for an existing chat, we need to add the new user message.
      const baseMessages = newChatCreated
        ? activeChat.messages
        : imagePlaceholderMsg
          ? [...activeChat.messages, userMessage, imagePlaceholderMsg]
          : [...activeChat.messages, userMessage];
      const finalMessages = [...baseMessages, botMessage];

      // Update the chat on the server.
      const finalChatResponse = await updateChat(activeChat._id, { messages: finalMessages });

      // After the chat is updated, fetch all images and match to __image__ placeholders
      let enhancedFinal = finalChatResponse.data;
      try {
        // Always try to match all __image__ placeholders to fetched URLs
        if (activeChat && activeChat._id) {
          const images = await fetchAllImages(activeChat._id);
          const urlPromises = images.map(img => fetchImageById(activeChat._id, img._id));
          const urls = await Promise.all(urlPromises);
          let imageIdx = 0;
          enhancedFinal = {
            ...finalChatResponse.data,
            messages: finalChatResponse.data.messages.map(m => {
              if (m.sender === 'user' && m.content === '__image__' && urls[imageIdx]) {
                const msgWithUrl = { ...m, imageUrl: urls[imageIdx] };
                imageIdx++;
                return msgWithUrl;
              }
              return m;
            })
          };
        }
      } catch (e) {
        // fallback: use local preview if available
        if (imagePlaceholderMsg && localImageUrl) {
          enhancedFinal = {
            ...finalChatResponse.data,
            messages: finalChatResponse.data.messages.map(m =>
              m.sender === 'user' && m.content === '__image__'
                ? { ...m, imageUrl: localImageUrl }
                : m
            ),
          };
        }
      }
      setCurrentChat(enhancedFinal);
      setChats(prevChats => prevChats.map(c => (c._id === enhancedFinal._id ? enhancedFinal : c)));
    } catch (error) {
      console.error('Error during message sending:', error);
      // Restore expert analysis count if request failed
      if (isExpertMode) {
        setExpertAnalysisRemaining(prev => prev + 1);
      }
      // In case of an error, revert to a consistent state.
      fetchChats();
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
      
      // Delay cleanup to ensure server URLs are fully loaded and rendered
      setTimeout(() => {
        // Revoke blob URL only if we successfully replaced with persisted URL
        if (localImageUrl && replacedWithPersisted) {
          try { URL.revokeObjectURL(localImageUrl); } catch {}
        }
        // Clear image preview and selected image after server URLs are ready
        setImagePreviewUrl(null);
        setSelectedImage(null);
      }, 200);
      
      // Reset image file input to allow re-uploading same file
      if (imageFileInputRef && imageFileInputRef.current) {
        imageFileInputRef.current.value = null;
      }
    }
  };

  const handleNewChat = () => {
    setCurrentChat(null);
    setMessage('');
  };

  const handleDeleteChat = async (id) => {
    try {
      await deleteChat(id);
      const updatedChats = chats.filter((chat) => chat._id !== id);
      setChats(updatedChats);

      if (currentChat && currentChat._id === id) {
        setCurrentChat(updatedChats.length > 0 ? updatedChats[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  const handleClearChats = async () => {
    setShowClearChatsModal(false);
    try {
      await Promise.all(chats.map(chat => deleteChat(chat._id)));
      setChats([]);
      setCurrentChat(null);
    } catch (error) {
      console.error('Failed to clear all chats:', error);
    }
  };

  // Theme toggle is now handled by the ThemeContext

  const handleLogout = () => {
    setShowLogoutModal(false);
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  // Format time for chat messages
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if the message is from today
    const isToday = date.toDateString() === now.toDateString();
    
    // Check if the message is from yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Today, ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${dateStr}, ${timeStr}`;
    }
  };

  // Allow up to 4 images per chat session
  const getUserImageCount = () => {
    if (!currentChat || !currentChat.messages) return 0;
    return currentChat.messages.filter(m => m.sender === 'user' && m.content === '__image__' && m.imageUrl).length;
  };
  const maxImagesPerChat = 4;
  const userImageCount = getUserImageCount();
  const isImageUploadDisabled = (() => {
    if (imagePreviewUrl || selectedImage) return true; // image selected but not uploaded yet
    if (userImageCount >= maxImagesPerChat) return true;
    return false;
  })();

  return (
    <div className={`${styles.chatContainer} ${isSidebarOpen ? styles.sidebarOpen : ''} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <Sidebar 
        userInfo={userInfo}
        chats={chats}
        currentChat={currentChat}
        handleNewChat={handleNewChat}
        setCurrentChat={setCurrentChat}
        handleDeleteChat={handleDeleteChat}
        theme={theme}
        handleThemeToggle={toggleTheme}
        onClearChatsClick={() => setShowClearChatsModal(true)}
        onLogoutClick={() => setShowLogoutModal(true)}
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <ChatArea 
        currentChat={currentChat}
        chatId={currentChat?._id}
        isLoading={isLoading}
        isTranscribing={isTranscribing}
        isRecording={isRecording}
        messageAreaRef={messageAreaRef}
        formatTime={formatTime}
        imagePreviewUrl={imagePreviewUrl}
        handleClearAttachment={handleClearAttachment}
        selectedFile={selectedFile}
        theme={theme}
        handleSendMessage={handleSendMessage}
        handleAudioFileChange={handleAudioFileChange}
        audioFileInputRef={audioFileInputRef}
        handleImageFileChange={handleImageFileChange}
        imageFileInputRef={imageFileInputRef}
        isAttachmentMenuOpen={isAttachmentMenuOpen}
        setIsAttachmentMenuOpen={setIsAttachmentMenuOpen}
        handleToggleRecording={handleToggleRecording}
        message={message}
        setMessage={setMessage}
        isImageUploadDisabled={isImageUploadDisabled}
        userImageCount={userImageCount}
        maxImagesPerChat={maxImagesPerChat}
        onExpertClick={handleExpertClick}
        expertAnalysisRemaining={expertAnalysisRemaining}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        handleOpenCamera={handleOpenCamera}
        isCameraOpen={isCameraOpen}
        handleCloseCamera={handleCloseCamera}
        handleCapturePhoto={handleCapturePhoto}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onSuggestedQuestionClick={handleSuggestedQuestionClick}
        userStatus={userStatus}
      />
      {/* Clear Chats Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearChatsModal}
        onClose={() => setShowClearChatsModal(false)}
        onConfirm={handleClearChats}
        title="Clear All Chats"
        message="Are you sure you want to clear all your chat history? This action cannot be undone."
        confirmText="Clear All"
        cancelText="Cancel"
        confirmVariant="danger"
      />
      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </div>
  );
};

export default ChatPage;

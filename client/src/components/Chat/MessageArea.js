import React, { useMemo, memo, useState } from 'react';
import styles from '../../pages/ChatPage.module.css';
import FeedbackButtons from './FeedbackButtons';

const MessageArea = memo(({
  currentChat,
  isLoading,
  isTranscribing,
  isRecording,
  messageAreaRef,
  formatTime,
  chatId,
  onSuggestedQuestionClick,
  userStatus,
}) => {
  const [modalImage, setModalImage] = useState(null);

  const openImageModal = (imageUrl) => {
    setModalImage(imageUrl);
  };

  const closeImageModal = () => {
    setModalImage(null);
  };
  // Function to parse bot response and extract suggested questions
  const parseBotResponse = (content) => {
    if (!content) return { mainAnswer: content, suggestedQuestions: [] };

    // Look for "Similar questions" section with various patterns in multiple languages
    const patterns = [
      // English
      /💡\s*Similar questions:?\s*([\s\S]*?)$/i,
     
      
      // Hindi (समान प्रश्न / समान सवाल)
      /💡\s*समान प्रश्न:?\s*([\s\S]*?)$/i,
      /समान प्रश्न:?\s*([\s\S]*?)$/i,
      /💡\s*समान सवाल:?\s*([\s\S]*?)$/i,
      /समान सवाल:?\s*([\s\S]*?)$/i,
      
      // Telugu (సారూప్య ప్రశ్నలు)
      /💡\s* సిమిలార్ ప్రశ్నలు:?\s*([\s\S]*?)$/i,
      /సారూప్య ప్రశ్నలు:?\s*([\s\S]*?)$/i,
      /💡\s*ఇలాంటి ప్రశ్నలు:?\s*([\s\S]*?)$/i,
      
      // Tamil (ஒத்த கேள்விகள்)
      /💡\s*ஒத்த கேள்விகள்:?\s*([\s\S]*?)$/i,
      /ஒத்த கேள்விகள்:?\s*([\s\S]*?)$/i,
      
      // Kannada (ಸಮಾನ ಪ್ರಶ್ನೆಗಳು)
      /💡\s*ಸಮಾನ ಪ್ರಶ್ನೆಗಳು:?\s*([\s\S]*?)$/i,
      /ಸಮಾನ ಪ್ರಶ್ನೆಗಳು:?\s*([\s\S]*?)$/i,
      
      // Malayalam (സമാന ചോദ്യങ്ങൾ)
      /💡\s*സമാന ചോദ്യങ്ങൾ:?\s*([\s\S]*?)$/i,
      /സമാന ചോദ്യങ്ങൾ:?\s*([\s\S]*?)$/i,
      
      // Bengali (অনুরূপ প্রশ্ন)
      /💡\s*অনুরূপ প্রশ্ন:?\s*([\s\S]*?)$/i,
      /অনুরূপ প্রশ্ন:?\s*([\s\S]*?)$/i,
      
      // Marathi (समान प्रश्न)
      /💡\s*समान प्रश्न:?\s*([\s\S]*?)$/i,
      /समान प्रश्न:?\s*([\s\S]*?)$/i,
      
      // Gujarati (સમાન પ્રશ્નો)
      /💡\s*સમાન પ્રશ્નો:?\s*([\s\S]*?)$/i,
      /સમાન પ્રશ્નો:?\s*([\s\S]*?)$/i,
      
      // Punjabi (ਸਮਾਨ ਸਵਾਲ)
      /💡\s*ਸਮਾਨ ਸਵਾਲ:?\s*([\s\S]*?)$/i,
      /ਸਮਾਨ ਸਵਾਲ:?\s*([\s\S]*?)$/i
    ];
    let mainAnswer = content;
    let suggestedQuestions = [];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // Extract main answer (everything before the suggested questions)
        mainAnswer = content.substring(0, match.index).trim();
        
        // Extract suggested questions
        const questionsText = match[1].trim();
        // Split by newlines and filter out empty lines
        suggestedQuestions = questionsText
          .split('\n')
          .map(q => q.trim())
          .filter(q => q.length > 0)
          .map(q => q.replace(/^[-•*\d+.)\s]+/, '').trim()) // Remove bullets, numbers, etc.
          .filter(q => q.length > 0)
          .slice(0, 3); // Limit to 3 questions
        
        break;
      }
    }

    return { mainAnswer, suggestedQuestions };
  };

  // Function to format AI response content for better readability
  const formatAIResponse = (content) => {
    if (!content) return content;

    // Clean up the content first - remove markdown artifacts and clean formatting
    let cleanContent = content
      .replace(/\*\*LLM-Classified Agriculture Answer\*\*/g, 'Agriculture Analysis')
      .replace(/\*\*Agriculture Classification Result\*\*/g, 'Analysis Result')
      .replace(/\*\*/g, '') // Remove all remaining markdown bold
      .replace(/\(EN\):/g, '') // Remove language indicators
      .replace(/\n\n+/g, '\n\n') // Clean up multiple line breaks
      .trim();

    // Split content into logical sections
    const sections = cleanContent.split(/(?=\n\n|Management strategies:|Symptoms:|Causes:|Prevention:|Treatment:|In summary|Summary:|Conclusion:)/);
    
    return sections.map((section, index) => {
      const trimmedSection = section.trim();
      
      if (trimmedSection.length === 0) return null;
      
      // Handle section headers
      if (trimmedSection.toLowerCase().includes('management strategies') ||
          trimmedSection.toLowerCase().includes('symptoms') ||
          trimmedSection.toLowerCase().includes('causes') ||
          trimmedSection.toLowerCase().includes('prevention') ||
          trimmedSection.toLowerCase().includes('treatment') ||
          trimmedSection.toLowerCase().includes('identification') ||
          trimmedSection.toLowerCase().includes('diagnosis')) {
        return (
          <div key={index} className={styles.aiSectionHeader}>
            {trimmedSection}
          </div>
        );
      }
      
      // Handle numbered lists
      if (/^\d+\./.test(trimmedSection)) {
        return (
          <div key={index} className={styles.aiListItem}>
            {trimmedSection}
          </div>
        );
      }
      
      // Handle bullet points
      if (trimmedSection.startsWith('•') || trimmedSection.startsWith('-')) {
        return (
          <div key={index} className={styles.aiListItem}>
            {trimmedSection}
          </div>
        );
      }
      
      // Handle summary/conclusion sections
      if (trimmedSection.toLowerCase().includes('summary') || 
          trimmedSection.toLowerCase().includes('conclusion') ||
          trimmedSection.toLowerCase().includes('in summary')) {
        return (
          <div key={index} className={styles.aiSummary}>
            {trimmedSection}
          </div>
        );
      }
      
      // Handle regular paragraphs
      if (trimmedSection.length > 0) {
        return (
          <div key={index} className={styles.aiParagraph}>
            {trimmedSection}
          </div>
        );
      }
      
      return null;
    }).filter(Boolean); // Remove null entries
  };

  // Helper component for copy button
  const CopyButton = ({ content, className = '', style = {} }) => {
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    };

    return (
      <button
        className={`${styles.copyButton} ${className}`}
        title={isCopied ? "Copied!" : "Copy"}
        onClick={handleCopy}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '6px',
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          transform: 'scale(1)',
          boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
          ...style 
        }}
        onMouseEnter={(e) => {
          if (!isCopied) {
            e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
          }
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 0 0 rgba(0, 0, 0, 0)';
        }}
        onMouseDown={(e) => {
          e.target.style.transform = isCopied ? 'scale(1)' : 'scale(0.95)';
        }}
        onMouseUp={(e) => {
          if (!isCopied) {
            e.target.style.transform = 'scale(1.1)';
          }
        }}
      >
        {isCopied ? (
          // Checkmark/tick icon
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ color: '#10b981' }}
          >
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        ) : (
          // Copy icon
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ color: '#6b7280' }}
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        )}
      </button>
    );
  };

  // Function to group messages
  const groupMessages = (messages) => {
    const grouped = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      
      // If this is a user text message and next is a user image message, group them
      if (
        m.sender === 'user' && m.content !== '__image__' &&
        messages[i + 1] && messages[i + 1].sender === 'user' && 
        messages[i + 1].content === '__image__' && messages[i + 1].imageUrl
      ) {
        grouped.push({
          type: 'user-text-image',
          text: m.content,
          imageUrl: messages[i + 1].imageUrl,
          timestamp: messages[i + 1].timestamp,
        });
        i++; // skip the next message since it's grouped
      }
      // If this is a user image message and next is a user text message, group them
      else if (
        m.sender === 'user' && m.content === '__image__' && m.imageUrl &&
        messages[i + 1] && messages[i + 1].sender === 'user' && 
        messages[i + 1].content !== '__image__'
      ) {
        grouped.push({
          type: 'user-image-text',
          imageUrl: m.imageUrl,
          text: messages[i + 1].content,
          timestamp: messages[i + 1].timestamp,
        });
        i++; // skip the next message since it's grouped
      } 
      else if (m.sender === 'user' && m.content === '__image__' && m.imageUrl) {
        grouped.push({
          type: 'user-image',
          imageUrl: m.imageUrl,
          timestamp: m.timestamp,
        });
      } 
      else if (m.sender === 'user' && m.content !== '__image__') {
        grouped.push({
          type: 'user-text',
          text: m.content,
          timestamp: m.timestamp,
        });
      } 
      else if (m.sender === 'bot') {
        grouped.push({
          type: 'bot',
          text: m.content,
          timestamp: m.timestamp,
        });
      }
    }
    return grouped;
  };

  // Function to render grouped messages
  const renderGroupedMessages = (groupedMessages) => {
    return groupedMessages.map((item, idx) => {
      // Determine what content to copy
      let copyContent = '';
      if (item.type === 'user-image-text' || item.type === 'user-text-image') {
        copyContent = item.text; // Only text, not image URL
      } else if (item.type === 'user-image') {
        copyContent = item.imageUrl;
      } else if (item.type === 'user-text') {
        copyContent = item.text;
      } else if (item.type === 'bot') {
        copyContent = item.text;
      }

      const handleMouseEnter = (e) => {
        const btn = e.currentTarget.querySelector('.userCopyBtn');
        if (btn) btn.style.display = 'flex';
      };

      const handleMouseLeave = (e) => {
        const btn = e.currentTarget.querySelector('.userCopyBtn');
        if (btn) btn.style.display = 'none';
      };

      switch (item.type) {
        case 'user-image-text':
        case 'user-text-image':
          return (
            <div 
              key={idx} 
              className={`${styles.messageWrapper} ${styles.userMessageWrapper}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className={`${styles.message} ${styles.userMessage}`}>
                <img 
                  src={item.imageUrl} 
                  alt="Attachment" 
                  className={styles.imagePreview}
                  onClick={() => openImageModal(item.imageUrl)}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{marginTop: '0.75rem'}}>
                  {item.text}
                </div>
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: '24px'}}>
                <span 
                  className="userCopyBtn" 
                  style={{
                    display: 'none',
                    marginRight: '8px'
                  }}
                >
                  <CopyButton content={copyContent} />
                </span>
              </div>
              <div className={styles.messageTimestamp}>{formatTime(item.timestamp)}</div>
            </div>
          );

        case 'user-image':
          return (
            <div key={idx} className={`${styles.messageWrapper} ${styles.userMessageWrapper}`}>
              <div className={`${styles.message} ${styles.userMessage}`}>
                <img 
                  src={item.imageUrl} 
                  alt="Attachment" 
                  className={styles.imagePreview}
                  onClick={() => openImageModal(item.imageUrl)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <CopyButton content={copyContent} />
              </div>
              <div className={styles.messageTimestamp}>{formatTime(item.timestamp)}</div>
            </div>
          );

        case 'user-text':
          return (
            <div 
              key={idx} 
              className={`${styles.messageWrapper} ${styles.userMessageWrapper}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className={`${styles.message} ${styles.userMessage}`}>
                {item.text}
              </div>
              <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: '24px'}}>
                <span 
                  className="userCopyBtn" 
                  style={{
                    display: 'none',
                    marginRight: '8px'
                  }}
                >
                  <CopyButton content={copyContent} />
                </span>
              </div>
              <div className={styles.messageTimestamp}>{formatTime(item.timestamp)}</div>
            </div>
          );

        case 'bot':
          const BotMessage = () => {
            const [isMessageHovered, setIsMessageHovered] = React.useState(false);
            const { mainAnswer, suggestedQuestions } = parseBotResponse(item.text);
            
            return (
              <div 
                key={idx} 
                className={`${styles.messageWrapper} ${styles.botMessageWrapper}`}
                onMouseEnter={() => setIsMessageHovered(true)}
                onMouseLeave={() => setIsMessageHovered(false)}
              >
                <div className={`${styles.message} ${styles.botMessage}`}>
                  <div className={styles.aiResponseContent}>
                    {formatAIResponse(mainAnswer)}
                  </div>
                </div>
                <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'center', minHeight: '24px', gap: '4px'}}>
                  <SpeakerButton answer={mainAnswer} />
                  <CopyButton content={copyContent} />
                  <FeedbackButtons 
                    messageId={item._id || `msg-${idx}`}
                    messageContent={item.text}
                    chatId={chatId}
                    isParentHovered={isMessageHovered}
                  />
                </div>
                <div className={styles.messageTimestamp}>{formatTime(item.timestamp)}</div>
                
                {/* Suggested Questions Section */}
                {suggestedQuestions.length > 0 && (
                  <div className={styles.suggestedQuestionsContainer}>
                    <div className={styles.suggestedQuestionsHeader}>
                      <span className={styles.suggestedQuestionsIcon}>💡</span>
                      <span className={styles.suggestedQuestionsTitle}>Similar questions</span>
                    </div>
                    <div className={styles.suggestedQuestionsList}>
                      {suggestedQuestions.map((question, qIdx) => (
                        <button
                          key={qIdx}
                          className={styles.suggestedQuestionItem}
                          onClick={() => onSuggestedQuestionClick && onSuggestedQuestionClick(question)}
                          title="Click to ask this question"
                        >
                          <span className={styles.suggestedQuestionNumber}>{qIdx + 1}</span>
                          <span className={styles.suggestedQuestionText}>{question}</span>
                          <svg 
                            className={styles.suggestedQuestionArrow}
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          };
          
          return <BotMessage key={idx} />;

        default:
          return null;
      }
    });
  };

  // Memoize grouped messages to prevent unnecessary recalculations
  const groupedMessages = useMemo(() => {
    if (!currentChat || !currentChat.messages) return [];
    return groupMessages(currentChat.messages);
  }, [currentChat, currentChat?.messages]);

  // Memoize rendered messages - only recalculate when messages or chatId changes
  const renderedMessages = useMemo(() => {
    return renderGroupedMessages(groupedMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedMessages, chatId]);

  return (
    <>
      <div ref={messageAreaRef} className={styles.messageArea}>
        {/* User Status Warning */}
        {(userStatus?.isBlocked || userStatus?.isTimedOut) && (
          <div className={styles.moderationWarning}>
            <div className={styles.moderationIcon}>
              {userStatus.isBlocked ? '🚫' : '⏰'}
            </div>
            <div className={styles.moderationContent}>
              <h3 className={styles.moderationTitle}>
                {userStatus.isBlocked ? 'Account Blocked' : 'Account Temporarily Suspended'}
              </h3>
              <p className={styles.moderationMessage}>
                {userStatus.isBlocked 
                  ? 'Your account has been blocked. You cannot send messages at this time.'
                  : `Your account is temporarily suspended until ${new Date(userStatus.timeoutUntil).toLocaleString()}.`
                }
              </p>
              {userStatus.reason && (
                <p className={styles.moderationReason}>
                  <strong>Reason:</strong> {userStatus.reason}
                </p>
              )}
              <p className={styles.moderationContact}>
                Please contact support if you believe this is an error.
              </p>
            </div>
          </div>
        )}
        
        {!currentChat && (
          <div className={styles.welcomeMessage}>
            <h2>
              <span className={styles.welcomeGradientText}>Welcome to AgriChat!</span> 
              <span className={styles.welcomeEmoji}>🌾</span>
            </h2>
            <p>Your AI-powered agricultural assistant</p>
            <p>Ask me anything about crops, diseases, farming techniques, and more!</p>
          </div>
        )}
        
        {renderedMessages}
        
        {isLoading && !isTranscribing && !isRecording && (
          <div className={`${styles.messageWrapper} ${styles.botMessageWrapper}`}>
            <div className={`${styles.message} ${styles.botMessage} ${styles.typingIndicator}`}>
              <div className={styles.typingDots}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div 
          className={styles.imageModal}
          onClick={closeImageModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImageModal();
            }}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '28px',
              fontWeight: '300',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: 10000,
              lineHeight: '1',
              padding: 0,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
              e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95) rotate(90deg)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
            }}
          >
            ×
          </button>
          <img 
            src={modalImage} 
            alt="Full size" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
              cursor: 'default'
            }}
          />
        </div>
      )}
    </>
  );
});

MessageArea.displayName = 'MessageArea';

// Speaker button for reading bot answers aloud
const SpeakerButton = ({ answer }) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const synthRef = React.useRef(window.speechSynthesis);
  const utterRef = React.useRef(null);

  // Function to detect language from text
  const detectLanguage = (text) => {
    if (!text) return 'en-US';
    
    // Indian language Unicode ranges
    const languagePatterns = {
      'hi-IN': /[\u0900-\u097F]/, // Hindi (Devanagari)
      'te-IN': /[\u0C00-\u0C7F]/, // Telugu
      'ta-IN': /[\u0B80-\u0BFF]/, // Tamil
      'bn-IN': /[\u0980-\u09FF]/, // Bengali
      'mr-IN': /[\u0900-\u097F]/, // Marathi (Devanagari - same as Hindi)
      'gu-IN': /[\u0A80-\u0AFF]/, // Gujarati
      'kn-IN': /[\u0C80-\u0CFF]/, // Kannada
      'ml-IN': /[\u0D00-\u0D7F]/, // Malayalam
      'pa-IN': /[\u0A00-\u0A7F]/, // Punjabi (Gurmukhi)
      'or-IN': /[\u0B00-\u0B7F]/, // Odia
      'as-IN': /[\u0980-\u09FF]/, // Assamese (Bengali script)
    };

    // Check for Indian language scripts
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    // Default to English
    return 'en-US';
  };

  // Function to get the best voice for a language
  const getVoiceForLanguage = (lang) => {
    const voices = synthRef.current.getVoices();
    
    // Try to find a voice that matches the exact language
    let voice = voices.find(v => v.lang === lang);
    
    // If not found, try to find a voice with the same language code (e.g., 'hi' from 'hi-IN')
    if (!voice) {
      const langCode = lang.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(langCode));
    }
    
    return { voice, hasNativeVoice: !!voice };
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!answer) return;

    // Detect language and get appropriate voice
    const detectedLang = detectLanguage(answer);
    const { voice } = getVoiceForLanguage(detectedLang);

    const utter = new window.SpeechSynthesisUtterance(answer);
    utter.lang = detectedLang;
    if (voice) {
      utter.voice = voice;
    }
    utter.rate = 0.9; // Slightly slower for better clarity
    utter.pitch = 1;
    utter.volume = 1;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    utterRef.current = utter;
    setIsSpeaking(true);
    synthRef.current.speak(utter);
  };

  React.useEffect(() => {
    // Load voices when component mounts
    const loadVoices = () => {
      synthRef.current.getVoices();
    };
    
    // Chrome loads voices asynchronously
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = loadVoices;
    }
    loadVoices();

    const synth = synthRef.current;
    return () => {
      if (isSpeaking) synth.cancel();
    };
  }, [isSpeaking]);

  return (
    <button
      className={styles.copyButton}
      title={isSpeaking ? 'Stop speaking' : 'Read answer'}
      aria-label="Read answer"
      onClick={handleSpeak}
      style={{
        background: hovered ? 'rgba(16, 185, 129, 0.12)' : 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
        boxShadow: hovered ? '0 4px 12px rgba(16, 185, 129, 0.12)' : '0 0 0 rgba(0,0,0,0)',
        marginRight: '8px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={e => e.target.style.transform = 'scale(0.95)'}
      onMouseUp={e => e.target.style.transform = 'scale(1.1)'}
    >
      {/* Speaker icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSpeaking ? '#10b981' : '#6b7280' }}>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    </button>
  );
};

export default MessageArea;
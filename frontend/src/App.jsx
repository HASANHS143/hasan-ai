import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Avatar,
  Badge,
  Fab
} from '@mui/material';
import {
  CameraAlt,
  Mic,
  MicOff,
  Upload,
  Send,
  Image as ImageIcon,
  Audiotrack,
  InsertDriveFile,
  Menu,
  Close,
  CheckCircle,
  CloudUpload,
  PhotoCamera,
  KeyboardVoice,
  AttachFile,
  SmartToy,
  Settings,
  Refresh,
  Download,
  Delete,
  Info,
  Error
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './App.css';

// API configuration
const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api');

function App() {
  // State management
  const [messages, setMessages] = useState([
    { id: 1, text: "👋 Hello! I'm Hasan AI Assistant. I can help you with:", sender: 'ai' },
    { id: 2, text: "📷 Process images from camera or upload", sender: 'ai' },
    { id: 3, text: "🎤 Record and transcribe voice messages", sender: 'ai' },
    { id: 4, text: "📁 Upload and analyze files (PDF, images, docs)", sender: 'ai' },
    { id: 5, text: "💬 Chat with AI for any questions", sender: 'ai' },
    { id: 6, text: "Try any feature from the control panel!", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Refs
  const webcamRef = useRef(null);
  const recorderRef = useRef(null);
  const chatContainerRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Check backend connection on startup
  useEffect(() => {
    checkConnection();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const checkConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      setConnectionStatus(response.data.openai === 'connected' ? 'connected' : 'no-api-key');
    } catch (error) {
      setConnectionStatus('disconnected');
      showSnackbar('Cannot connect to backend server', 'error');
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Dropzone for file upload
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.webm', '.ogg', '.m4a'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  });

  async function handleFileDrop(acceptedFiles) {
    if (acceptedFiles.length === 0) return;

    showSnackbar(`Uploading ${acceptedFiles.length} file(s)...`, 'info');
    setIsProcessing(true);

    for (const file of acceptedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_BASE}/process-file`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
          setUploadedFiles(prev => [...prev, {
            id: Date.now(),
            name: file.name,
            type: file.type,
            size: file.size,
            result: response.data,
            timestamp: new Date().toISOString()
          }]);

          addMessage(`📄 Uploaded: ${file.name}`, 'user');
          addMessage(`File processed: ${response.data.content.substring(0, 150)}...`, 'ai');
          showSnackbar(`${file.name} uploaded successfully!`, 'success');
        }
      } catch (error) {
        console.error('Upload error:', error);
        addMessage(`❌ Failed to upload ${file.name}`, 'error');
        showSnackbar(`Failed to upload ${file.name}: ${error.response?.data?.error || 'Network error'}`, 'error');
      }
    }
    setIsProcessing(false);
  }

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      mediaStreamRef.current = stream;
      
      recorderRef.current = new (window.RecordRTC || window.WebcamRecorder)(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: window.StereoAudioRecorder,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        timeSlice: 1000,
        ondataavailable: () => {}
      });
      
      recorderRef.current.startRecording();
      setIsRecording(true);
      showSnackbar('Recording started... Speak now!', 'info');
    } catch (error) {
      console.error('Recording error:', error);
      showSnackbar('Microphone access denied or not available', 'error');
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    return new Promise((resolve) => {
      recorderRef.current.stopRecording(async () => {
        const blob = recorderRef.current.getBlob();
        setIsRecording(false);
        
        // Stop all tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        await processAudioBlob(blob);
        recorderRef.current = null;
        resolve();
      });
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const processAudioBlob = async (blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        const response = await axios.post(`${API_BASE}/process-voice`, {
          audioData: base64Audio
        });

        if (response.data.success) {
          addMessage(`🎤 ${response.data.text}`, 'user');
          await sendMessage(response.data.text);
          showSnackbar('Voice processed successfully!', 'success');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Audio processing error:', error);
      addMessage('❌ Failed to process audio', 'error');
      showSnackbar('Voice processing failed', 'error');
    }
    setIsProcessing(false);
  };

  // Camera functions
  const capturePhoto = () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      processImage(imageSrc);
      setIsCameraOpen(false);
      showSnackbar('Photo captured!', 'success');
    }
  };

  const processImage = async (imageData) => {
    setIsProcessing(true);
    addMessage('📷 Processing image...', 'ai');
    
    try {
      const response = await axios.post(`${API_BASE}/process-image`, {
        base64Image: imageData
      });

      if (response.data.success) {
        addMessage(`📸 ${response.data.description}`, 'ai');
        showSnackbar('Image analyzed successfully!', 'success');
      }
    } catch (error) {
      console.error('Image processing error:', error);
      addMessage('❌ Failed to process image', 'error');
      showSnackbar('Image processing failed', 'error');
    }
    setIsProcessing(false);
  };

  // Chat functions
  const addMessage = (text, sender) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async (text = null) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    addMessage(messageText, 'user');
    if (!text) setInput('');

    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        message: messageText,
        history: messages
          .filter(m => m.sender !== 'error')
          .map(m => ({
            text: m.text,
            sender: m.sender
          }))
      });

      if (response.data.success) {
        addMessage(response.data.response, 'ai');
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('❌ Failed to get response. Please check connection.', 'error');
      showSnackbar('Chat service unavailable', 'error');
    }
    setIsProcessing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      { id: 1, text: "Chat cleared. How can I help you today?", sender: 'ai' }
    ]);
    showSnackbar('Chat cleared', 'info');
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
    showSnackbar('File removed', 'info');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f0f2f5' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: 320,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 320,
            boxSizing: 'border-box',
            bgcolor: '#1a2332',
            color: 'white',
            borderRight: '1px solid #2d3748'
          },
        }}
      >
        <Toolbar sx={{ bgcolor: '#0f172a', borderBottom: '1px solid #2d3748' }}>
          <Avatar sx={{ bgcolor: '#3b82f6', mr: 2 }}>
            <SmartToy />
          </Avatar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Hasan AI
          </Typography>
          <IconButton onClick={() => setSidebarOpen(false)} sx={{ color: '#94a3b8' }}>
            <Close />
          </IconButton>
        </Toolbar>

        <Box sx={{ p: 3, borderBottom: '1px solid #2d3748' }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2 }}>
            Connection Status
          </Typography>
          <Chip
            icon={connectionStatus === 'connected' ? <CheckCircle /> : 
                  connectionStatus === 'no-api-key' ? <Info /> : <Error />}
            label={connectionStatus === 'connected' ? 'AI Connected' : 
                   connectionStatus === 'no-api-key' ? 'API Key Needed' : 'Disconnected'}
            color={connectionStatus === 'connected' ? 'success' : 
                   connectionStatus === 'no-api-key' ? 'warning' : 'error'}
            variant="outlined"
            sx={{ width: '100%', mb: 2 }}
          />
          
          {connectionStatus === 'no-api-key' && (
            <Alert severity="warning" sx={{ fontSize: '0.8rem', mb: 2 }}>
              Add OPENAI_API_KEY for full AI features
            </Alert>
          )}
        </Box>

        <List sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', px: 2, mb: 1 }}>
            Quick Actions
          </Typography>
          
          <ListItem disablePadding sx={{ mb: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<CameraAlt />}
              onClick={() => setIsCameraOpen(true)}
              sx={{ 
                bgcolor: '#3b82f6', 
                '&:hover': { bgcolor: '#2563eb' },
                justifyContent: 'flex-start',
                px: 3,
                py: 1.5
              }}
            >
              Open Camera
            </Button>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={isRecording ? <MicOff /> : <Mic />}
              onClick={toggleRecording}
              color={isRecording ? 'error' : 'primary'}
              sx={{ 
                bgcolor: isRecording ? '#ef4444' : '#3b82f6',
                '&:hover': { bgcolor: isRecording ? '#dc2626' : '#2563eb' },
                justifyContent: 'flex-start',
                px: 3,
                py: 1.5
              }}
            >
              {isRecording ? 'Stop Recording' : 'Voice Record'}
            </Button>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 2 }}>
            <Box {...getRootProps()} sx={{ width: '100%' }}>
              <input {...getInputProps()} />
              <Button
                fullWidth
                variant="contained"
                startIcon={<CloudUpload />}
                sx={{ 
                  bgcolor: '#10b981', 
                  '&:hover': { bgcolor: '#059669' },
                  justifyContent: 'flex-start',
                  px: 3,
                  py: 1.5
                }}
              >
                Upload Files
              </Button>
            </Box>
          </ListItem>

          <ListItem disablePadding>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Refresh />}
              onClick={clearChat}
              sx={{ 
                color: '#94a3b8',
                borderColor: '#4b5563',
                '&:hover': { borderColor: '#6b7280', bgcolor: 'rgba(255,255,255,0.05)' },
                justifyContent: 'flex-start',
                px: 3,
                py: 1.5
              }}
            >
              Clear Chat
            </Button>
          </ListItem>
        </List>

        <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #2d3748' }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2 }}>
            Uploaded Files ({uploadedFiles.length})
          </Typography>
          {uploadedFiles.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 2 }}>
              No files uploaded yet
            </Typography>
          ) : (
            uploadedFiles.slice(-3).map((file) => (
              <Card key={file.id} sx={{ 
                bgcolor: '#2d3748', 
                mb: 1, 
                '&:hover': { bgcolor: '#374151' }
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InsertDriveFile sx={{ color: '#60a5fa' }} />
                      <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8rem' }}>
                        {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => removeFile(file.id)} sx={{ color: '#9ca3af' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 0.5 }}>
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static" sx={{ 
          bgcolor: 'white', 
          color: '#1f2937',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <Toolbar>
            {!sidebarOpen && (
              <IconButton onClick={() => setSidebarOpen(true)} sx={{ mr: 2 }}>
                <Menu />
              </IconButton>
            )}
            <Avatar sx={{ bgcolor: '#3b82f6', mr: 2 }}>
              AI
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Hasan AI Assistant
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                Unlimited access • All features enabled
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isProcessing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Processing...
                  </Typography>
                </Box>
              )}
              
              <Chip
                icon={<CheckCircle />}
                label="Online"
                color="success"
                variant="outlined"
                size="small"
              />
              
              <Fab
                size="small"
                color="primary"
                onClick={checkConnection}
                sx={{ boxShadow: 'none' }}
              >
                <Refresh />
              </Fab>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Chat Area */}
        <Box
          ref={chatContainerRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 3,
            bgcolor: '#f8fafc',
            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
                animation: 'fadeIn 0.3s ease-in'
              }}
            >
              <Paper
                sx={{
                  p: 2,
                  maxWidth: '75%',
                  position: 'relative',
                  bgcolor: message.sender === 'user' ? '#3b82f6' : 
                           message.sender === 'error' ? '#fef2f2' : 'white',
                  color: message.sender === 'user' ? 'white' : '#1f2937',
                  border: message.sender === 'error' ? '1px solid #ef4444' : 
                          message.sender === 'user' ? 'none' : '1px solid #e5e7eb',
                  borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  boxShadow: message.sender === 'user' ? '0 2px 8px rgba(59, 130, 246, 0.3)' : 
                             '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="body1" sx={{ 
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {message.text}
                </Typography>
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  mt: 1,
                  opacity: 0.7,
                  color: message.sender === 'user' ? '#bfdbfe' : '#6b7280',
                  fontSize: '0.7rem'
                }}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Paper>
            </Box>
          ))}
          
          {isProcessing && messages[messages.length - 1]?.sender === 'user' && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Paper sx={{ p: 2, borderRadius: '18px 18px 18px 4px', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Thinking...
                  </Typography>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>

        {/* Input Area */}
        <Box sx={{ 
          p: 3, 
          borderTop: '1px solid #e5e7eb', 
          bgcolor: 'white',
          boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)'
        }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Fab
                size="medium"
                color="primary"
                onClick={() => setIsCameraOpen(true)}
                sx={{ boxShadow: 'none' }}
              >
                <PhotoCamera />
              </Fab>
            </Grid>
            
            <Grid item>
              <Fab
                size="medium"
                color={isRecording ? "error" : "primary"}
                onClick={toggleRecording}
                sx={{ boxShadow: 'none' }}
              >
                {isRecording ? <MicOff /> : <KeyboardVoice />}
              </Fab>
            </Grid>
            
            <Grid item>
              <Box {...getRootProps()}>
                <input {...getInputProps()} />
                <Fab
                  size="medium"
                  color="primary"
                  sx={{ boxShadow: 'none' }}
                >
                  <AttachFile />
                </Fab>
              </Box>
            </Grid>
            
            <Grid item xs>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your message here... (Press Enter to send)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                multiline
                maxRows={4}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '25px',
                    bgcolor: '#f8fafc',
                    '&:hover': {
                      bgcolor: '#f1f5f9'
                    }
                  }
                }}
              />
            </Grid>
            
            <Grid item>
              <Button
                variant="contained"
                endIcon={<Send />}
                onClick={() => sendMessage()}
                disabled={isProcessing || !input.trim()}
                sx={{ 
                  bgcolor: '#3b82f6', 
                  '&:hover': { bgcolor: '#2563eb' },
                  borderRadius: '25px',
                  px: 3,
                  py: 1.5
                }}
              >
                Send
              </Button>
            </Grid>
          </Grid>
          
          {isDragActive && (
            <Box sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(59, 130, 246, 0.9)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: 'white'
            }}>
              <CloudUpload sx={{ fontSize: 80, mb: 3 }} />
              <Typography variant="h4" sx={{ mb: 1 }}>
                Drop files here
              </Typography>
              <Typography variant="body1">
                Upload images, documents, audio files...
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Camera Modal */}
      <Dialog 
        open={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a2332', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraAlt />
            <Typography variant="h6">Camera</Typography>
          </Box>
          <IconButton onClick={() => setIsCameraOpen(false)} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, bgcolor: '#000' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            style={{ 
              width: '100%', 
              height: 'auto',
              display: 'block'
            }}
          />
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#1a2332', 
          justifyContent: 'center',
          py: 2 
        }}>
          <Button
            variant="contained"
            startIcon={<CameraAlt />}
            onClick={capturePhoto}
            sx={{ 
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              px: 4,
              py: 1
            }}
          >
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
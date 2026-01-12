// ============================================
// HASAN AI BACKEND - COMPLETE WORKING VERSION
// ============================================

// Load environment variables FIRST
const dotenv = require('dotenv');
const path = require('path');

// Explicitly load .env file
const envPath = path.resolve(__dirname, '.env');
console.log('📂 Looking for .env at:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('❌ Error loading .env file:', result.error.message);
} else {
    console.log('✅ .env file loaded successfully');
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ============================================
// OPENAI v4 INITIALIZATION - WORKING
// ============================================
let openai;
let openaiStatus = 'checking';

console.log('🔍 Initializing OpenAI...');

// Check if API key exists
if (process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY.trim();
    console.log(`🔑 API Key found (${apiKey.length} chars)`);
    console.log(`🔑 Starts with 'sk-': ${apiKey.startsWith('sk-')}`);
    
    if (!apiKey.startsWith('sk-')) {
        openaiStatus = 'invalid_format';
        console.log('❌ Invalid API key format. Must start with "sk-"');
    } else if (apiKey.length < 20) {
        openaiStatus = 'too_short';
        console.log('❌ API key seems too short');
    } else {
        try {
            // OpenAI v4 import
            const { OpenAI } = require('openai');
            
            openai = new OpenAI({
                apiKey: apiKey,
            });
            
            openaiStatus = 'connected';
            console.log('✅ OpenAI API configured successfully');
            
            // Quick test
            testOpenAIConnection();
            
        } catch (error) {
            openaiStatus = 'initialization_error';
            console.log('❌ OpenAI init error:', error.message);
        }
    }
} else {
    openaiStatus = 'not_configured';
    console.log('❌ OPENAI_API_KEY not found in .env file');
}

// Test OpenAI connection
async function testOpenAIConnection() {
    if (!openai) return;
    
    try {
        console.log('🧪 Testing OpenAI connection...');
        const response = await openai.models.list();
        
        if (response && response.data) {
            console.log(`✅ OpenAI connection successful!`);
            console.log(`📊 Available models: ${response.data.length}`);
            openaiStatus = 'connected';
        }
    } catch (error) {
        console.log('❌ OpenAI test failed:', error.message);
        openaiStatus = 'connection_failed';
    }
}

const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 
            'text/plain',
            'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Hasan AI API is running!',
        version: '2.0.0',
        openai: openaiStatus,
        endpoints: {
            health: '/api/health',
            chat: '/api/chat',
            image: '/api/process-image',
            voice: '/api/process-voice',
            file: '/api/process-file',
            test: '/api/test-openai'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        openai: openaiStatus,
        api_key_configured: !!process.env.OPENAI_API_KEY
    });
});

// Test OpenAI endpoint
app.get('/api/test-openai', async (req, res) => {
    try {
        if (!openai || openaiStatus !== 'connected') {
            return res.json({
                success: false,
                status: openaiStatus,
                message: `OpenAI not ready. Status: ${openaiStatus}`
            });
        }
        
        const testResponse = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a test assistant. Respond with 'AI is working!'" },
                { role: "user", content: "Say hello" }
            ],
            max_tokens: 10
        });
        
        const aiResponse = testResponse.choices[0].message.content;
        
        res.json({
            success: true,
            status: openaiStatus,
            message: 'OpenAI API is working!',
            response: aiResponse,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.json({
            success: false,
            status: openaiStatus,
            error: error.message,
            message: 'OpenAI test failed'
        });
    }
});

// ============================================
// CHAT ENDPOINT - WORKING VERSION
// ============================================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                error: 'Message is required' 
            });
        }

        console.log(`💬 Chat request: "${message.substring(0, 50)}..."`);
        console.log(`🤖 OpenAI status: ${openaiStatus}`);

        // USE OPENAI IF AVAILABLE
        if (openai && openaiStatus === 'connected') {
            console.log('🚀 Calling OpenAI API...');
            
            try {
                const chatHistory = history.slice(-5);
                
                const response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: `You are Hasan AI, a helpful assistant with capabilities:
- Process images from camera
- Transcribe voice messages  
- Analyze uploaded files
- Answer questions knowledgeably
- Provide step-by-step guidance

Be friendly, concise, and helpful. Current time: ${new Date().toLocaleString()}`
                        },
                        ...chatHistory.map(msg => ({
                            role: msg.sender === 'user' ? 'user' : 'assistant',
                            content: msg.text
                        })),
                        { role: "user", content: message }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                });

                const aiResponse = response.choices[0].message.content;
                console.log(`✅ AI Response: ${aiResponse.substring(0, 100)}...`);

                return res.json({
                    success: true,
                    response: aiResponse,
                    timestamp: new Date().toISOString(),
                    model: 'gpt-3.5-turbo',
                    openai: true
                });

            } catch (aiError) {
                console.log('❌ OpenAI error:', aiError.message);
                
                // If OpenAI fails, use fallback
                return res.json({
                    success: true,
                    response: `I'm Hasan AI! You said: "${message}".\n\nOpenAI error: ${aiError.message}. Please check your API key.`,
                    timestamp: new Date().toISOString(),
                    openai: false,
                    error: aiError.message
                });
            }
        }

        // FALLBACK RESPONSE (No OpenAI)
        console.log('⚠️ Using fallback response');
        
        const fallbackResponses = [
            `Hello! I'm Hasan AI. You said: "${message}". For AI responses, configure your OpenAI API key.`,
            `Got your message: "${message}". Set up OpenAI API key to enable AI chat.`,
            `You asked: "${message}". Add API key from https://platform.openai.com for intelligent responses.`,
            `Hi! Your message: "${message}". OpenAI status: ${openaiStatus}. Configure API key for full features.`
        ];
        
        const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];

        res.json({
            success: true,
            response: randomResponse,
            timestamp: new Date().toISOString(),
            openai: false,
            status: openaiStatus
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PROCESS IMAGES
// ============================================
app.post('/api/process-image', upload.single('image'), async (req, res) => {
    try {
        let imageData = null;
        
        if (req.body.base64Image) {
            imageData = req.body.base64Image;
        } else if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            imageData = `data:${req.file.mimetype};base64,${fileBuffer.toString('base64')}`;
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'No image provided' 
            });
        }

        // Use OpenAI if available
        if (openai && openaiStatus === 'connected') {
            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4-vision-preview",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Describe this image" },
                                { type: "image_url", image_url: { url: imageData } }
                            ]
                        }
                    ],
                    max_tokens: 300
                });

                return res.json({
                    success: true,
                    description: response.choices[0].message.content,
                    timestamp: new Date().toISOString(),
                    openai: true
                });
            } catch (visionError) {
                console.log('Vision error:', visionError.message);
            }
        }

        res.json({
            success: true,
            description: 'Image received! Configure OpenAI API key for AI analysis.',
            timestamp: new Date().toISOString(),
            openai: false
        });

    } catch (error) {
        console.error('Image error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PROCESS VOICE
// ============================================
app.post('/api/process-voice', upload.single('audio'), async (req, res) => {
    try {
        let audioData = null;
        
        if (req.body.audioData) {
            audioData = req.body.audioData;
        } else if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            audioData = fileBuffer.toString('base64');
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        } else {
            return res.status(400).json({ 
                success: false, 
                error: 'No audio provided' 
            });
        }

        // Use OpenAI if available
        if (openai && openaiStatus === 'connected') {
            try {
                const audioBuffer = Buffer.from(audioData, 'base64');
                const tempFile = `temp_audio_${uuidv4()}.webm`;
                fs.writeFileSync(tempFile, audioBuffer);
                
                const fileStream = fs.createReadStream(tempFile);
                const response = await openai.audio.transcriptions.create({
                    file: fileStream,
                    model: "whisper-1",
                    response_format: "text"
                });
                
                fs.unlinkSync(tempFile);
                
                return res.json({
                    success: true,
                    text: response,
                    timestamp: new Date().toISOString(),
                    openai: true
                });
            } catch (whisperError) {
                console.log('Whisper error:', whisperError.message);
            }
        }

        res.json({
            success: true,
            text: 'Audio received! Configure OpenAI for transcription.',
            timestamp: new Date().toISOString(),
            openai: false
        });

    } catch (error) {
        console.error('Voice error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// PROCESS FILES
// ============================================
app.post('/api/process-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }

        const filePath = req.file.path;
        let content = '';
        
        try {
            content = fs.readFileSync(filePath, 'utf8');
        } catch {
            content = `File: ${req.file.originalname} (${req.file.size} bytes)`;
        } finally {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            filename: req.file.originalname,
            size: req.file.size,
            content: content.substring(0, 500),
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('File error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }
    
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Hasan AI Backend running on port ${PORT}`);
    console.log(`🌐 OpenAI Status: ${openaiStatus}`);
    console.log(`📁 Upload limit: 100MB`);
    console.log(`✅ Health: http://localhost:${PORT}/api/health`);
    console.log(`🧪 OpenAI Test: http://localhost:${PORT}/api/test-openai`);
    console.log(`🎯 Frontend: http://localhost:3000`);
});
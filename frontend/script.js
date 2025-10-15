// Global variables
let currentUser = null;
let currentToken = null;
let students = [];
let videoStream = null;
let faceDetector = null;
let isRecognitionRunning = false;
let recognitionInterval = null;

// API Base URL
//const API_BASE = 'https://your-backend.onrender.com/api';
//const API_URL = 'http://localhost:5000';
const API_BASE = 'http://localhost:5000/api';

// TensorFlow.js Face Detection
class FaceRecognition {
    constructor() {
        this.model = null;
        this.isLoaded = false;
    }

    async loadModel() {
        try {
            // Load FaceLandmarks model from TensorFlow Hub
            this.model = await faceLandmarksDetection.load(
                faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
                { maxFaces: 1 }
            );
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('Error loading TensorFlow model:', error);
            return false;
        }
    }

    async detectFace(videoElement) {
        if (!this.isLoaded) return null;

        try {
            const predictions = await this.model.estimateFaces({
                input: videoElement,
                returnTensors: false,
                flipHorizontal: false,
                predictIrises: false
            });

            if (predictions.length > 0) {
                return predictions[0];
            }
            return null;
        } catch (error) {
            console.error('Error detecting face:', error);
            return null;
        }
    }

    generateFaceDescriptor(facePrediction) {
        if (!facePrediction) return null;

        // Create a simple descriptor from face landmarks
        const landmarks = facePrediction.scaledMesh;
        let descriptor = [];

        // Use key points for descriptor (simplified approach)
        const keyPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; // Basic face points

        keyPoints.forEach(index => {
            if (landmarks[index]) {
                descriptor.push(landmarks[index][0]); // x coordinate
                descriptor.push(landmarks[index][1]); // y coordinate
            }
        });

        return descriptor;
    }

    calculateFaceDistance(desc1, desc2) {
        if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;

        let sumSquaredDiff = 0;
        for (let i = 0; i < desc1.length; i++) {
            sumSquaredDiff += Math.pow(desc1[i] - desc2[i], 2);
        }
        return Math.sqrt(sumSquaredDiff);
    }

    findBestMatch(currentDescriptor, students, threshold = 100) {
        let bestMatch = null;
        let bestDistance = Infinity;

        students.forEach(student => {
            if (student.face_descriptor && student.face_descriptor.length > 0) {
                const distance = this.calculateFaceDistance(currentDescriptor, student.face_descriptor);
                if (distance < bestDistance && distance < threshold) {
                    bestDistance = distance;
                    bestMatch = student;
                }
            }
        });

        return bestMatch ? { student: bestMatch, confidence: 1 - (bestDistance / threshold) } : null;
    }
}

// Initialize TensorFlow.js face recognition
const faceRecognition = new FaceRecognition();

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const dashboard = document.getElementById('dashboard');
const authForm = document.getElementById('auth-form');
const toggleAuth = document.getElementById('toggle-auth');
const authBtn = document.getElementById('auth-btn');
const logoutBtn = document.getElementById('logout-btn');
const userSpan = document.getElementById('user-name');
const authMessage = document.getElementById('auth-message');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkExistingAuth();
    setupEventListeners();
});

function setupEventListeners() {
    // Auth events
    authForm.addEventListener('submit', handleAuth);
    toggleAuth.addEventListener('click', toggleAuthMode);
    logoutBtn.addEventListener('click', logout);
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Face registration events
    document.getElementById('load-models').addEventListener('click', loadTensorFlowModels);
    document.getElementById('capture-btn').addEventListener('click', captureAndAnalyzeFace);
    document.getElementById('save-face').addEventListener('click', saveFaceData);
    
    // Attendance events
    document.getElementById('start-recognition').addEventListener('click', startRecognition);
    document.getElementById('stop-recognition').addEventListener('click', stopRecognition);
}

function checkExistingAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
    }
}

function toggleAuthMode(e) {
    e.preventDefault();
    const registerFields = document.getElementById('register-fields');
    const isRegister = registerFields.style.display === 'none';
    
    registerFields.style.display = isRegister ? 'block' : 'none';
    authBtn.textContent = isRegister ? 'Register' : 'Login';
    toggleAuth.innerHTML = isRegister 
        ? 'Already have an account? <a href="#">Login</a>' 
        : 'Don\'t have an account? <a href="#">Register</a>';
    
    // Clear form and messages
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('name').value = '';
    authMessage.style.display = 'none';
}

async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value.trim();
    const isRegister = authBtn.textContent === 'Register';
    
    // Manual validation
    if (!email || !password) {
        showAuthMessage('Please fill in all required fields', 'error');
        return;
    }
    
    if (isRegister && !name) {
        showAuthMessage('Please enter your name', 'error');
        return;
    }
    
    const endpoint = isRegister ? '/register' : '/login';
    const body = isRegister ? { email, password, name } : { email, password };
    
    try {
        showAuthMessage('Processing...', 'info');
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAuthMessage(data.message || 'Success!', 'success');
            currentToken = data.token;
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setTimeout(() => showDashboard(), 1500);
        } else {
            showAuthMessage(data.error || 'Authentication failed', 'error');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthMessage('Error connecting to server. Make sure backend is running on port 5000.', 'error');
    }
}

function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `message-${type}`;
    authMessage.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            authMessage.style.display = 'none';
        }, 3000);
    }
}

function showDashboard() {
    authScreen.classList.remove('active');
    dashboard.classList.add('active');
    userSpan.textContent = currentUser.name;
    loadStudents();
}

function logout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dashboard.classList.remove('active');
    authScreen.classList.add('active');
    stopRecognition();
    
    // Clear form
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    document.getElementById('name').value = '';
    authMessage.style.display = 'none';
}

function switchTab(tabName) {
    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'students') {
        loadStudentsList();
        loadAttendanceRecords();
    } else if (tabName === 'mark') {
        updateStudentsCount();
    }
}

// TensorFlow.js Functions
async function loadTensorFlowModels() {
    try {
        showStatus('Loading TensorFlow.js models...', 'info', 'register-status');
        
        const success = await faceRecognition.loadModel();
        if (success) {
            startVideo('video');
            document.getElementById('capture-btn').disabled = false;
            document.getElementById('start-recognition').disabled = false;
            showStatus('✅ TensorFlow.js models loaded successfully!', 'success', 'register-status');
        } else {
            showStatus('❌ Failed to load TensorFlow models', 'error', 'register-status');
        }
    } catch (error) {
        showStatus('Error loading TensorFlow models: ' + error.message, 'error', 'register-status');
        console.error('Model loading error:', error);
    }
}

function startVideo(elementId) {
    const video = document.getElementById(elementId);
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
        } 
    })
    .then(stream => {
        videoStream = stream;
        video.srcObject = stream;
    })
    .catch(err => {
        showStatus('Error accessing camera: ' + err.message, 'error', 'register-status');
        console.error('Camera error:', err);
    });
}

async function captureAndAnalyzeFace() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    try {
        showStatus('Analyzing face with TensorFlow.js...', 'info', 'register-status');
        
        const facePrediction = await faceRecognition.detectFace(video);
        
        if (facePrediction) {
            // Draw face landmarks on canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            drawFaceLandmarks(context, facePrediction);
            
            // Generate face descriptor
            window.currentFaceDescriptor = faceRecognition.generateFaceDescriptor(facePrediction);
            
            document.getElementById('save-face').disabled = false;
            showStatus('✅ Face analyzed successfully! Ready to save.', 'success', 'register-status');
        } else {
            showStatus('❌ No face detected. Please ensure your face is clearly visible.', 'error', 'register-status');
        }
    } catch (error) {
        showStatus('Error analyzing face: ' + error.message, 'error', 'register-status');
        console.error('Face analysis error:', error);
    }
}

function drawFaceLandmarks(context, prediction) {
    const landmarks = prediction.scaledMesh;
    
    // Draw face bounding box
    context.strokeStyle = '#28a745';
    context.lineWidth = 2;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    landmarks.forEach(point => {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
    });
    
    context.strokeRect(minX, minY, maxX - minX, maxY - minY);
    
    // Draw key landmarks
    context.fillStyle = '#28a745';
    const keyPoints = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Basic face points
    keyPoints.forEach(index => {
        if (landmarks[index]) {
            context.beginPath();
            context.arc(landmarks[index][0], landmarks[index][1], 3, 0, 2 * Math.PI);
            context.fill();
        }
    });
    
    context.fillStyle = '#28a745';
    context.font = '16px Arial';
    context.fillText('Face Detected!', minX, minY - 10);
}

async function saveFaceData() {
    const name = document.getElementById('student-name').value;
    const rollNumber = document.getElementById('student-roll').value;
    
    if (!name || !rollNumber || !window.currentFaceDescriptor) {
        showStatus('Please enter student details and analyze face', 'error', 'register-status');
        return;
    }
    
    try {
        showStatus('Saving student data...', 'info', 'register-status');
        
        const response = await fetch(`${API_BASE}/save-face`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                name,
                rollNumber,
                faceDescriptor: window.currentFaceDescriptor
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`✅ ${data.message} - ${name} (${rollNumber})`, 'success', 'register-status');
            // Reset form
            document.getElementById('student-name').value = '';
            document.getElementById('student-roll').value = '';
            document.getElementById('save-face').disabled = true;
            window.currentFaceDescriptor = null;
            
            // Clear canvas
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Reload students
            loadStudents();
        } else {
            showStatus('❌ ' + data.error, 'error', 'register-status');
        }
    } catch (error) {
        showStatus('Error saving student data', 'error', 'register-status');
        console.error('Save face error:', error);
    }
}

// Attendance Recognition
async function startRecognition() {
    if (!faceRecognition.isLoaded) {
        showStatus('Please load TensorFlow models first', 'error', 'attendance-status');
        return;
    }
    
    if (students.length === 0) {
        showStatus('No students registered for recognition', 'error', 'attendance-status');
        return;
    }
    
    startVideo('attendance-video');
    isRecognitionRunning = true;
    
    const video = document.getElementById('attendance-video');
    const canvas = document.getElementById('attendance-canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    showStatus('🔍 Starting real-time face recognition...', 'info', 'attendance-status');
    
    recognitionInterval = setInterval(async () => {
        if (!isRecognitionRunning) return;
        
        try {
            const facePrediction = await faceRecognition.detectFace(video);
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            if (facePrediction) {
                // Draw face landmarks
                drawFaceLandmarks(context, facePrediction);
                
                // Generate descriptor and find match
                const currentDescriptor = faceRecognition.generateFaceDescriptor(facePrediction);
                const match = faceRecognition.findBestMatch(currentDescriptor, students);
                
                if (match) {
                    const confidence = Math.round(match.confidence * 100);
                    document.getElementById('confidence').textContent = `${confidence}%`;
                    
                    // Auto-mark attendance if confidence is high enough
                    if (confidence > 70 && !window.recentlyMarked) {
                        await markAttendance(match.student.id);
                        window.recentlyMarked = true;
                        setTimeout(() => { window.recentlyMarked = false; }, 5000); // Prevent rapid re-marking
                    }
                } else {
                    document.getElementById('confidence').textContent = '0%';
                }
            }
        } catch (error) {
            console.error('Recognition error:', error);
        }
    }, 1000); // Process every second
    
    document.getElementById('start-recognition').disabled = true;
    document.getElementById('stop-recognition').disabled = false;
}

function stopRecognition() {
    isRecognitionRunning = false;
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
    }
    document.getElementById('start-recognition').disabled = false;
    document.getElementById('stop-recognition').disabled = true;
    document.getElementById('confidence').textContent = '0%';
    
    // Clear canvas
    const canvas = document.getElementById('attendance-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    showStatus('Recognition stopped', 'info', 'attendance-status');
}

async function markAttendance(studentId) {
    try {
        const response = await fetch(`${API_BASE}/mark-attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ studentId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showStatus(`✅ ${data.message}`, 'success', 'attendance-status');
            loadAttendanceRecords();
        } else {
            showStatus('❌ ' + data.error, 'error', 'attendance-status');
        }
    } catch (error) {
        console.error('Mark attendance error:', error);
        showStatus('Error marking attendance', 'error', 'attendance-status');
    }
}

// Data Management Functions
async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE}/students`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.ok) {
            students = await response.json();
            updateStudentsCount();
        }
    } catch (error) {
        console.error('Load students error:', error);
    }
}

function updateStudentsCount() {
    document.getElementById('students-count').textContent = students.length;
}

async function loadStudentsList() {
    try {
        const response = await fetch(`${API_BASE}/students`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const studentsList = await response.json();
        const container = document.getElementById('students-list-container');
        
        if (studentsList.length === 0) {
            container.innerHTML = '<div class="info status-message">No students registered yet</div>';
            return;
        }
        
        container.innerHTML = studentsList.map(student => `
            <div class="student-card">
                <h5>${student.name}</h5>
                <p><strong>Roll No:</strong> ${student.roll_number}</p>
                <p><strong>Registered:</strong> ${new Date(student.created_at).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load students list error:', error);
        document.getElementById('students-list-container').innerHTML = 
            '<div class="error status-message">Error loading students</div>';
    }
}

async function loadAttendanceRecords() {
    try {
        const response = await fetch(`${API_BASE}/attendance`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        const records = await response.json();
        const container = document.getElementById('attendance-records-container');
        
        if (records.length === 0) {
            container.innerHTML = '<div class="info status-message">No attendance records yet</div>';
            return;
        }
        
        container.innerHTML = records.map(record => `
            <div class="attendance-card present">
                <h5>${record.students.name}</h5>
                <p><strong>Roll No:</strong> ${record.students.roll_number}</p>
                <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${record.time}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Load attendance error:', error);
        document.getElementById('attendance-records-container').innerHTML = 
            '<div class="error status-message">Error loading attendance records</div>';
    }
}

// Utility Functions
function showStatus(message, type, elementId) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
}

// Health check on startup
async function checkServerHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        console.log('Server health:', data);
    } catch (error) {
        console.warn('Server not responding:', error);
    }
}

// Initialize health check
checkServerHealth();
# 🧠 Online Attendance System with Face Recognition (AI)

An **AI-powered online attendance system** that uses **facial recognition** for real-time attendance marking.  
Built using **TensorFlow.js**, **HTML/CSS/JavaScript** for the frontend, and a **Node.js backend** for managing API requests and authentication.

---

## 📁 Project Structure

```
attendance-system/
├── backend/
│   ├── server.js        # Node.js backend server
│   ├── package.json     # Dependencies and scripts
│   ├── .env             # Environment variables (not included in repo)
├── frontend/
│   ├── index.html       # Main UI for the attendance system
│   ├── style.css        # Styling and layout for the frontend
│   ├── script.js        # Handles camera, face recognition, and API calls
│   ├── tf-models/       # Auto-downloaded TensorFlow.js models
└── README.md            # Project documentation
```

---

## 🚀 Features

✅ Real-time face recognition using TensorFlow.js  
✅ Automatic attendance marking  
✅ Simple and intuitive web interface  
✅ Secure backend API with environment variables  
✅ Cross-platform browser compatibility  
✅ AI-based facial matching — no manual attendance needed  

---

## 🧰 Technologies Used

**Frontend:**
- HTML5  
- CSS3  
- JavaScript (ES6)  
- TensorFlow.js  

**Backend:**
- Node.js  
- Express.js  
- dotenv (for environment variables)  

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository
```bash
git clone https://github.com/<your-username>/attendance-system.git
cd attendance-system
```

### 2️⃣ Backend setup
```bash
cd backend
npm install
```

Create a `.env` file inside `/backend`:
```
PORT=5000
```

Start the backend:
```bash
node server.js
```

### 3️⃣ Frontend setup
Open `frontend/index.html` in your browser (or use Live Server in VS Code).  
The required TensorFlow models will be auto-downloaded into the `tf-models/` folder.

---

## 🧠 How It Works

1. The user opens the web app and allows camera access.  
2. TensorFlow.js loads pre-trained face recognition models directly in the browser.  
3. The system detects and compares the user’s face with registered data.  
4. If recognized, attendance is automatically marked and sent to the backend.  

---

## 🔒 Environment Variables

Create a `.env` file in the `/backend` folder and define:
```
PORT=5000
```

*(Add more variables later if you connect a database or authentication system.)*

---

## 📸 Screenshots (optional)

You can add screenshots here showing:
- The login or home screen  
- Camera permission prompt  
- Real-time recognition display  

Example placeholder:
```
![App Screenshot](assets/screenshot1.png)
```

---

## 📜 License

This project is licensed under the **MIT License**.  
Feel free to use, modify, and distribute it.

---

## 💡 Future Improvements

- ✅ Database integration (MySQL or Firebase)  
- ✅ Admin dashboard for attendance management  
- ✅ User registration and facial data training  
- ✅ Cloud deployment (Render, Vercel, AWS, etc.)  

---

## 👨‍💻 Author

**Your Name**  
📧 [your-email@example.com]  
🌐 [https://github.com/your-username](https://github.com/your-username)

---

⭐ *If you like this project, give it a star on GitHub!*

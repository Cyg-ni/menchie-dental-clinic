import React, { useState } from 'react';
import { auth, db } from '../firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail // Added this
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

const Auth = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); // Added for success messages
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // --- New Reset Password Logic ---
  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset link sent! Check your email inbox.");
    } catch (err) {
      console.error("Reset Error:", err.code);
      setError("Could not send reset email. Ensure the email is correct.");
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const fullName = `${firstName} ${lastName}`;

        await sendEmailVerification(user);
        await updateProfile(user, { displayName: fullName });

        await setDoc(doc(db, "patients", user.uid), {
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          contactInfo: email,
          address: "B.C",
          age: "",
          gender: "",
          isPregnant: false,
          currentToothState: null,
          medicalHistory: {
            Allergies: { conditionNotes: "" },
            currentMedications: ""
          },
          role: "patient",
          createdAt: new Date().toISOString()
        });

        alert("Account created! Please check your email for verification.");
        setIsRegistering(false);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
          setError("Please verify your email before proceeding.");
          return;
        }

        navigate('/'); 
      }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('This email is already registered.');
      else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else if (err.code === 'auth/invalid-credential') setError('Invalid email or password.');
      else setError(err.message.replace('Firebase:', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-inter">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-2xl mb-4 overflow-hidden">
            <img 
              src="https://i.imgur.com/K6NksfF.jpeg" // Using your requested logo
              className="w-full h-full object-cover" 
              alt="Menchie's Dental Clinic Logo" 
            />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isRegistering ? 'Join Our Clinic' : 'Welcome Back'}
          </h2>
          <p className="text-gray-500 font-medium mt-1">Menchie's Dental Clinic</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">First Name</label>
                <input 
                  type="text" required
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                  placeholder="Juan"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Last Name</label>
                <input 
                  type="text" required
                  className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition"
                  placeholder="Dela Cruz"
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email Address</label>
            <input 
              type="email" required
              className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              placeholder="juan@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Password</label>
              {!isRegistering && (
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-bold text-indigo-500 hover:underline uppercase"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input 
              type="password" required
              className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100">
              {error}
            </div>
          )}

          {message && (
            <div className="p-4 rounded-2xl bg-green-50 text-green-600 text-sm font-semibold border border-green-100">
              {message}
            </div>
          )}

          <button 
            disabled={loading}
            className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-xl shadow-indigo-100 transition transform hover:-translate-y-1 active:scale-95 ${
              loading ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? 'Setting up...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <button 
            onClick={() => { setError(''); setMessage(''); setIsRegistering(!isRegistering); }}
            className="text-indigo-600 font-bold hover:text-indigo-800 transition text-sm"
          >
            {isRegistering ? 'Already a patient? Login here' : 'New patient? Register here'}
          </button>
          
          <div className="block">
            <Link to="/" className="text-gray-400 text-xs font-bold hover:text-gray-600 uppercase tracking-widest">
              ← Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
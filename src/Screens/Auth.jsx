import React, { useState } from 'react';
import { auth, db } from '../firebase-config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendEmailVerification 
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
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // 1. Create the Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const fullName = `${firstName} ${lastName}`;

        // 2. Send Verification Email
        await sendEmailVerification(user);

        // 3. Update Firebase Auth Display Name
        await updateProfile(user, { displayName: fullName });

        // 4. Create Firestore Patient Document (Matching your screenshot structure)
        await setDoc(doc(db, "patients", user.uid), {
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          contactInfo: email,
          address: "B.C", // Default placeholder
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

        alert("Account created! Please check your email for a verification link before logging in.");
        setIsRegistering(false); // Switch to login view
      } else {
        // Login Logic
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Optional: Check if email is verified before redirecting
        if (!userCredential.user.emailVerified) {
          setError("Please verify your email before proceeding. Check your inbox!");
          return;
        }

        navigate('/'); 
      }
    } catch (err) {
      console.error("Auth Error:", err.code);
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-2xl mb-4">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
              className="w-8 h-8" 
              alt="Clinic Logo" 
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
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
            <input 
              type="password" required
              className="w-full px-5 py-3 rounded-2xl bg-gray-50 border-none ring-1 ring-gray-200 focus:ring-2 focus:ring-indigo-600 outline-none transition"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-semibold border border-red-100 animate-pulse">
              {error}
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
            onClick={() => { setError(''); setIsRegistering(!isRegistering); }}
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
import React, { useState } from 'react';

const BookOpen = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 17a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
    <path d="M20 17H4" />
    <path d="M7 12V3h5l4 4v5" />
  </svg>
);

const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ExternalLogo = ({ size = 'w-6 h-6', className = '' }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/512/103/103386.png" 
    alt="Dental Clinic Logo" 
    className={`${size} ${className}`} 
    onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/24x24/f5f5f5/a0aec0?text=Logo" }}
  />
);

// dropdown
const serviceOptions = [
  "Routine Check-up & Cleaning",
  "Teeth Whitening (Cosmetic)",
  "Dental Implants Consultation",
  "Emergency Visit (Pain/Injury)",
  "Orthodontics Consultation",
  "Other / Not Sure"
];


// --- Main Component ---
const Appointment = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    message: ''
  });
  // Loading state to disable the button during submission simulation FIREBASE NOT YET HOOKED
  const [loading, setLoading] = useState(false); 
  // Status to show success/error messages
  const [submitStatus, setSubmitStatus] = useState(null); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setSubmitStatus(null);
    
    // --- START: Simulated Frontend Submission ---
    try {
        // Simulate an asynchronous API call (e.g., 2 seconds of network latency)
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log("Form Data Submitted (Simulated):", formData);
        setSubmitStatus({ 
            type: 'success', 
            message: 'Appointment request simulated successfully! This data was not saved to a database.' 
        });
        
     
        setFormData({
            fullName: '',
            email: '',
            service: '',
            date: new Date().toISOString().split('T')[0],
            message: ''
        });

    } catch (error) {
      console.error("Simulated submission failed:", error);
      setSubmitStatus({ 
          type: 'error', 
          message: `Simulated submission failed. Check console for details.` 
      });
    } finally {
      setLoading(false);
    }

  };


  return (
    <div className="min-h-screen bg-gray-50 font-inter">

     
      <section className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 text-gray-800 font-semibold text-xl">
            <ExternalLogo size="w-6 h-6" />
            <span>Menchie's Dental Clinic</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-lg">
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-150">Home</a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-150">About Us</a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition duration-150">Services</a>
          </nav>
          <div className="hidden sm:block">
            <button className="flex items-center px-4 py-2 bg-indigo-700 text-white font-medium rounded-xl shadow-lg transition duration-200 text-lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Book Appointment
            </button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        
        <div className="mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900">
              Book Your <span className="text-indigo-600">Appointment</span>
            </h1>
            <p className="text-lg text-gray-600 mt-2">
                Secure your visit with Menchie's Dental Clinic in three simple steps.
            </p>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          
          <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Patient Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
               
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="fullName"
                            id="fullName"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            placeholder="Type your full name"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                            placeholder="you@example.com"
                        />
                    </div>
                </div>

                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="service" className="block text-sm font-medium text-gray-700 mb-1">Select a service</label>
                        <select
                            name="service"
                            id="service"
                            value={formData.service}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none bg-white pr-8"
                        >
                            <option value="">-- Select --</option>
                            {serviceOptions.map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 top-6 bottom-0 flex items-center px-2 pointer-events-none sm:hidden">
                            
                        </div>
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Schedule a date</label>
                        <div className="relative">
                            <input
                                type="date"
                                name="date"
                                id="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                                min={new Date().toISOString().split('T')[0]} // Prevent selecting past dates
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none"
                            />
                            <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"/>
                        </div>
                    </div>
                </div>

                
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Additional message (optional)</label>
                    <textarea
                        name="message"
                        id="message"
                        rows="4"
                        value={formData.message}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        placeholder="Please include any specific details or concerns..."
                    ></textarea>
                </div>
                
               
                {submitStatus && (
                    <div className={`p-4 rounded-xl text-center font-medium ${
                        submitStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {submitStatus.message}
                    </div>
                )}


                
                <button
                    type="submit"
                    disabled={loading || submitStatus?.type === 'success'}
                    className={`w-full flex items-center justify-center px-6 py-3 font-semibold rounded-xl shadow-lg transition duration-200 text-lg ${
                        loading || submitStatus?.type === 'success'
                        ? 'bg-indigo-300 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                        </span>
                    ) : (
                        <>
                            <BookOpen className="w-5 h-5 mr-2" />
                            Confirm Appointment Request
                        </>
                    )}
                </button>
            </form>
          </div>

          <div className="hidden lg:block relative">
            <img 
              src="https://media.istockphoto.com/id/1311280344/photo/asian-dentist-explaining-tooth-x-rays-to-a-patient-with-digital-tablet-asian-young-attractive.jpg?s=612x612&w=0&k=20&c=eHIfwTNNrsbgdz3RwudbKhdGd9WM7EaeIdzcuktL5xE="
              alt="Dentist explaining tooth x-rays to a patient with digital tablet"
              className="w-full h-full object-cover rounded-2xl shadow-2xl border-4 border-white"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x600/f0f5ff/3730a3?text=Stock+Image+Placeholder" }}
            />
          </div>
        </div>
      </main>

    
      <footer className="w-full py-4 mt-16 text-center text-gray-500 text-sm border-t border-gray-200 bg-white">
        &copy; {new Date().getFullYear()} Menchie's Dental Clinic. All Rights Reserved.
      </footer>
    </div>
  );
};

export default Appointment;

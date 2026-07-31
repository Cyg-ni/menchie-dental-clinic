import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import TeethModelViewer from '../components/TeethModelViewer';

const PatientPortal = () => {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [toothConditions, setToothConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- 3D MODEL LOGIC STATES ---
  const [toothStates, setToothStates] = useState({});
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('status');
  const [activeSection, setActiveSection] = useState('appointments');
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const appointmentsPerPage = 5;
  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      if (user) {
        fetchPatientData(user.uid, user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, serviceFilter, dateFilter, activeSection, appointments]);

  const serviceOptions = Array.from(new Set(appointments.map((appt) => appt.serviceType).filter(Boolean))).sort();
  const filteredAppointments = appointments.filter((appointment) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch = !search ||
      appointment.serviceType?.toLowerCase().includes(search) ||
      appointment.patientFullName?.toLowerCase().includes(search) ||
      appointment.id?.toLowerCase().includes(search);
    const matchesService = !serviceFilter || appointment.serviceType === serviceFilter;
    const matchesDate = !dateFilter || appointment.scheduledDate === dateFilter;
    return matchesSearch && matchesService && matchesDate;
  });
  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / appointmentsPerPage));
  const pagedAppointments = filteredAppointments.slice((currentPage - 1) * appointmentsPerPage, currentPage * appointmentsPerPage);

  const fetchPatientData = async (uid, user) => {
    try {
      let profileDoc = await getDoc(doc(db, "patients", uid));
      const authName = user?.displayName || auth.currentUser?.displayName || '';
      const rawUserEmail = String(user?.email || '').trim();
      const normalizedUserEmail = String(user?.email || '').trim().toLowerCase();
      const normalizedUserName = String(authName || '').trim().toLowerCase();
      const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
      const tokenizeName = (value) =>
        String(value || '')
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((token) => token.length > 1);
      const nameSimilarityScore = (a, b) => {
        const tokensA = tokenizeName(a);
        const tokensB = new Set(tokenizeName(b));
        if (!tokensA.length || !tokensB.size) return 0;
        return tokensA.reduce((count, token) => count + (tokensB.has(token) ? 1 : 0), 0);
      };
      const getTreatmentCount = (data) => {
        const treatments = data?.treatments;
        if (Array.isArray(treatments)) return treatments.length;
        if (treatments && typeof treatments === 'object') return Object.keys(treatments).length;
        return 0;
      };
      const scorePatientDoc = (docSnap) => {
        const data = docSnap.data() || {};
        const candidateEmail = String(data.contactInfo || data.email || '').trim().toLowerCase();
        const candidateName = String(
          data.patientFullName ||
          data.fullName ||
          data.name ||
          `${data.patientFirstName || data.firstName || ''} ${data.patientLastName || data.lastName || ''}`
        )
          .trim()
          .toLowerCase();
        const candidatePhone = normalizePhone(data.phone_num || data.phone || '');
        const userPhone = normalizePhone(user?.phoneNumber || '');
        const treatmentCount = getTreatmentCount(data);

        let score = 0;
        if (docSnap.id === uid) score += 3;
        if (normalizedUserEmail && candidateEmail && candidateEmail === normalizedUserEmail) score += 6;
        if (normalizedUserName && candidateName && candidateName === normalizedUserName) score += 6;
        if (normalizedUserName && candidateName && candidateName !== normalizedUserName) score -= 4;
        if (userPhone && candidatePhone && candidatePhone === userPhone) score += 1;
        if (treatmentCount > 0) score += 1;
        return score;
      };
      let profileData = { fullName: authName || 'Patient' };

      const candidateDocsById = new Map();
      if (profileDoc.exists()) {
        candidateDocsById.set(profileDoc.id, profileDoc);
      }

      if (rawUserEmail) {
        const emailValues = [...new Set([rawUserEmail, normalizedUserEmail].filter(Boolean))];
        for (const emailValue of emailValues) {
          const contactInfoQuery = query(collection(db, "patients"), where("contactInfo", "==", emailValue));
          const contactInfoSnapshot = await getDocs(contactInfoQuery);
          contactInfoSnapshot.docs.forEach((docSnap) => candidateDocsById.set(docSnap.id, docSnap));

          const emailQuery = query(collection(db, "patients"), where("email", "==", emailValue));
          const emailSnapshot = await getDocs(emailQuery);
          emailSnapshot.docs.forEach((docSnap) => candidateDocsById.set(docSnap.id, docSnap));
        }
      }

      if (candidateDocsById.size > 0) {
        const sortedCandidates = Array.from(candidateDocsById.values()).sort((a, b) => scorePatientDoc(b) - scorePatientDoc(a));
        profileDoc = sortedCandidates[0];
      }

      if (!profileDoc.exists()) {
        const allPatientsSnapshot = await getDocs(collection(db, "patients"));
        const scoredMatches = [];

        allPatientsSnapshot.docs.forEach((docSnap) => {
          let score = scorePatientDoc(docSnap);

          if (score > 0) {
            scoredMatches.push({ score, docSnap });
          }
        });

        if (scoredMatches.length > 0) {
          scoredMatches.sort((a, b) => b.score - a.score);
          profileDoc = scoredMatches[0].docSnap;
        }
      }

      if (profileDoc.exists()) {
        const data = profileDoc.data();
        const fullName =
          data.patientFullName ||
          data.fullName ||
          data.name ||
          `${data.patientFirstName ?? data.firstName ?? ''} ${data.patientLastName ?? data.lastName ?? ''}`.trim() ||
          authName ||
          'Patient';
        profileData = { ...data, fullName };
      }

      let treatmentSourceData = profileData;
      if (candidateDocsById.size > 0 && getTreatmentCount(profileData) === 0) {
        const treatmentCandidates = Array.from(candidateDocsById.values())
          .map((docSnap) => {
            const data = docSnap.data() || {};
            const candidateEmail = String(data.contactInfo || data.email || '').trim().toLowerCase();
            const candidateName =
              data.patientFullName ||
              data.fullName ||
              data.name ||
              `${data.patientFirstName || data.firstName || ''} ${data.patientLastName || data.lastName || ''}`.trim();
            const treatmentsCount = getTreatmentCount(data);
            const similarity = nameSimilarityScore(authName, candidateName);
            return { data, candidateEmail, treatmentsCount, similarity };
          })
          .filter((candidate) =>
            candidate.treatmentsCount > 0 &&
            normalizedUserEmail &&
            candidate.candidateEmail === normalizedUserEmail
          )
          .sort((a, b) => {
            if (b.similarity !== a.similarity) return b.similarity - a.similarity;
            return b.treatmentsCount - a.treatmentsCount;
          });

        if (treatmentCandidates.length > 0 && treatmentCandidates[0].similarity > 0) {
          treatmentSourceData = treatmentCandidates[0].data;
        }
      }

      setProfile(profileData);

      const normalizeTreatments = (treatments) => {
        if (!treatments) return [];
        if (Array.isArray(treatments)) return treatments;
        if (typeof treatments === 'object') return Object.values(treatments);
        return [treatments];
      };

      const normalizeDate = (value) => {
        if (!value) return null;
        if (value?.toDate instanceof Function) return value.toDate();
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      };

      const toDisplayText = (value, fallback = '--') => {
        if (value === undefined || value === null || value === '') return fallback;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        if (Array.isArray(value)) {
          const joined = value.map((item) => toDisplayText(item, '')).filter(Boolean).join(', ');
          return joined || fallback;
        }
        if (typeof value === 'object') {
          const candidates = [
            value.condition,
            value.procedure,
            value.treatment,
            value.status,
            value.isScheduled,
            value.trackingNote,
            value.notes,
            value.label,
            value.name,
          ];
          const firstValid = candidates.find((item) => item !== undefined && item !== null && item !== '');
          return firstValid !== undefined ? String(firstValid) : fallback;
        }
        return fallback;
      };

      const rawTreatments = normalizeTreatments(treatmentSourceData.treatments);
      const statesObj = {};

      const toToothArray = (value) => {
        if (value === undefined || value === null) return [];
        const raw = Array.isArray(value) ? value : [value];
        return raw
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return item.toothNumber ?? item.tooth ?? item.number ?? null;
            }
            return item;
          })
          .filter((item) => item !== null && item !== undefined && item !== '')
          .map(String);
      };

      const getMissingTeethFromRecord = (record) => {
        const candidates = [
          record?.missingToothNumbers,
          record?.missingTeeth,
          record?.missing_tooth,
          record?.missingTooth,
          record?.missing,
        ];
        const merged = candidates.flatMap(toToothArray);
        return [...new Set(merged)];
      };

      const isMissingCondition = (value) =>
        String(value || '').toLowerCase().includes('missing');
      
      const formattedRecords = rawTreatments.map((record, index) => {
        const recordTeeth = toToothArray(record.teeth);
        const recordMissingTeeth = getMissingTeethFromRecord(record);
        const recordDateValue = normalizeDate(record.date);
        const formattedDate = recordDateValue ? recordDateValue.toLocaleDateString('en-PH') : "N/A";

        if (recordTeeth.length > 0) {
          recordTeeth.forEach(tNum => {
            const current = String(statesObj[tNum] || '').toLowerCase();
            const nextCondition = toDisplayText(record.condition ?? record.status, '').toLowerCase();
            const shouldForceMissing =
              isMissingCondition(record.condition) ||
              recordMissingTeeth.includes(String(tNum));

            if (current.includes('missing')) {
              return;
            }

            if (shouldForceMissing) {
              statesObj[tNum] = 'missing tooth';
            } else {
              statesObj[tNum] = nextCondition || 'healthy';
            }
          });
        }

        return {
          id: index,
          toothNumbers: recordTeeth,
          missingToothNumbers: recordMissingTeeth,
          date: formattedDate,
          rawDate: recordDateValue || new Date(0),
          condition: toDisplayText(record.condition ?? record.status),
          procedure: toDisplayText(record.procedure ?? record.treatment),
          treatment: toDisplayText(record.treatment ?? record.procedure),
          done: record.done ?? false
        };
      });

      setToothStates(statesObj);
      setToothConditions(formattedRecords.sort((a, b) => b.rawDate - a.rawDate));
      
      const contactEmail = profileData.contactInfo || profileData.email || user?.email || auth.currentUser?.email;
      const normalizedEmail = contactEmail?.trim().toLowerCase();
      const normalizedProfilePhone = normalizePhone(profileData.phone || profileData.phone_num || '');
      const normalizedProfileName = String(profileData.fullName || '').trim().toLowerCase();
      const appointmentMap = new Map();

      if (user?.uid) {
        const uidQuery = query(collection(db, "appointments"), where("patientUid", "==", user.uid));
        const uidSnapshot = await getDocs(uidQuery);
        uidSnapshot.docs.forEach((docSnap) => appointmentMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      }

      if (normalizedEmail) {
        const emailQuery = query(collection(db, "appointments"), where("patientEmail", "==", normalizedEmail));
        const emailSnapshot = await getDocs(emailQuery);
        emailSnapshot.docs.forEach((docSnap) => appointmentMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      }

      if (!appointmentMap.size && (profileData.phone || profileData.phone_num)) {
        const phoneValue = profileData.phone || profileData.phone_num;
        const phoneQuery = query(collection(db, "appointments"), where("patientPhone", "==", phoneValue));
        const phoneSnapshot = await getDocs(phoneQuery);
        phoneSnapshot.docs.forEach((docSnap) => appointmentMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
      }

      if (!appointmentMap.size) {
        const allAppointments = await getDocs(collection(db, "appointments"));
        allAppointments.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const docEmail = String(data.patientEmail || '').trim().toLowerCase();
          const docPhone = normalizePhone(data.patientPhone || '');

          if (
            (user?.uid && data.patientUid === user.uid) ||
            (normalizedEmail && docEmail === normalizedEmail) ||
            (normalizedProfilePhone && docPhone === normalizedProfilePhone)
          ) {
            appointmentMap.set(docSnap.id, { id: docSnap.id, ...data });
          }
        });
      }

      const sortedAppointments = Array.from(appointmentMap.values()).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || '').getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || '').getTime();
        return dateB - dateA;
      });

      setAppointments(sortedAppointments);

      if (!formattedRecords.length) {
        const appointmentTreatmentRecords = sortedAppointments
          .map((record, index) => {
            const recordTeeth = toToothArray(record.teeth || record.toothNumbers || record.affectedTeeth);
            const recordMissingTeeth = getMissingTeethFromRecord(record);
            const recordDateValue = normalizeDate(record.date || record.updated || record.createdAt);
            const clinicalCondition = toDisplayText(record.condition, '');
            const clinicalProcedure = toDisplayText(record.procedure ?? record.treatment, '');
            const clinicalNotes = toDisplayText(record.notes, '');
            const hasTreatmentContent =
              recordTeeth.length > 0 ||
              !!clinicalCondition ||
              !!clinicalProcedure ||
              !!clinicalNotes;

            if (!hasTreatmentContent) return null;

            return {
              id: `appt-${record.id || index}`,
              toothNumbers: recordTeeth,
              missingToothNumbers: recordMissingTeeth,
              date: recordDateValue ? recordDateValue.toLocaleDateString('en-PH') : 'N/A',
              rawDate: recordDateValue || new Date(0),
              condition: clinicalCondition || '--',
              procedure: clinicalProcedure || '--',
              treatment: toDisplayText(record.treatment ?? record.procedure, '--'),
              done: record.done ?? false,
            };
          })
          .filter(Boolean);

        if (appointmentTreatmentRecords.length > 0) {
          const fallbackStates = {};

          appointmentTreatmentRecords.forEach((record) => {
            record.toothNumbers.forEach((tNum) => {
              const current = String(fallbackStates[tNum] || '').toLowerCase();
              const nextCondition = String(record.condition || '').toLowerCase();
              const shouldForceMissing =
                isMissingCondition(record.condition) ||
                record.missingToothNumbers.includes(String(tNum));

              if (current.includes('missing')) return;
              fallbackStates[tNum] = shouldForceMissing ? 'missing tooth' : (nextCondition || 'healthy');
            });
          });

          setToothStates(fallbackStates);
          setToothConditions(appointmentTreatmentRecords.sort((a, b) => b.rawDate - a.rawDate));
        } else if (profileData.currentToothState && typeof profileData.currentToothState === 'object') {
          const mapEntries = Object.entries(profileData.currentToothState);
          const stateMap = {};
          const currentStateRecords = mapEntries.map(([toothNum, condition], index) => {
            stateMap[String(toothNum)] = String(condition || 'healthy').toLowerCase();
            return {
              id: `state-${index}`,
              toothNumbers: [String(toothNum)],
              missingToothNumbers: String(condition || '').toLowerCase().includes('missing') ? [String(toothNum)] : [],
              date: profileData.updated || 'N/A',
              rawDate: normalizeDate(profileData.updated) || new Date(0),
              condition: condition || '--',
              procedure: '--',
              treatment: '--',
              done: false,
            };
          });

          setToothStates(stateMap);
          setToothConditions(currentStateRecords);
        }
      }

      // Update profile with age/gender and medical info from the most recent appointment
      if (sortedAppointments.length > 0) {
        const latestAppointment = sortedAppointments[0];
        setProfile(prevProfile => ({
          ...prevProfile,
          age: latestAppointment.age || prevProfile.age,
          gender: latestAppointment.gender || prevProfile.gender,
          medicalHistory: latestAppointment.medicalHistory ? {
            ...prevProfile.medicalHistory,
            ...latestAppointment.medicalHistory
          } : prevProfile.medicalHistory,
          isSmoking: latestAppointment.medicalHistory?.isSmoking !== undefined ? latestAppointment.medicalHistory.isSmoking : prevProfile.isSmoking,
          isPregnant: latestAppointment.medicalHistory?.isPregnant !== undefined ? latestAppointment.medicalHistory.isPregnant : prevProfile.isPregnant,
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTUAL 3D RENDERER LOGIC ---
  // (Replaced by TeethModelViewer component)


  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-inter animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center print:hidden no-print">
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-black-400 hover:text-indigo-600 transition-colors group hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
          <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all hover:scale-105">
            Print Record
          </button>
        </div>

        <header className="border-b border-gray-100 pb-6 no-print">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Patient Dashboard</h1>
        </header>

        <div className="printable">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* PERSERVED DESIGN: Medical Profile Section */}
          <div className="lg:col-span-1 space-y-6 animate-slide-in-left">
            <div className="bg-white p-6 rounded-4xl shadow-sm border border-gray-100">
              <h2 className="text-xs font-bold text-black-500 uppercase tracking-widest mb-4">Personal Details</h2>
              <div className="space-y-3 text-sm border-b border-gray-50 pb-6">
                <p className="flex justify-between"><span className="text-black-500 font-medium">Full Name:</span> <span className="font-bold text-gray-700">{profile?.fullName || profile?.name || profile?.displayName || authUser?.displayName || `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() || 'Unknown Patient'}</span></p>
                <p className="flex justify-between"><span className="text-black-500 font-medium">Age/Gender:</span> <span className="font-bold text-gray-700">{profile?.age || 'Unknown age'} • {profile?.gender || 'Unknown gender'}</span></p>
              </div>

              <h2 className="text-xs font-bold text-black-500 uppercase tracking-widest mt-6 mb-4">Medical History</h2>
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-black-500 font-medium block mb-1">Allergies:</span>
                  <span className={`inline-block px-3 py-1 rounded-lg font-bold text-xs ${profile?.medicalHistory?.Allergies?.conditionNotes ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {profile?.medicalHistory?.Allergies?.conditionNotes || 'None Reported'}
                  </span>
                </div>
                <div className="flex gap-4 pt-2">
                   <div className={`flex-1 text-center p-3 rounded-2xl border ${profile?.isSmoking ? 'bg-orange-50 border-orange-100 text-orange-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] uppercase font-black">Smoker</p>
                      <p className="font-bold">{profile?.isSmoking ? 'Yes' : 'No'}</p>
                   </div>
                   <div className={`flex-1 text-center p-3 rounded-2xl border ${profile?.isPregnant ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100'}`}>
                      <p className="text-[10px] uppercase font-black">Pregnant</p>
                      <p className="font-bold">{profile?.isPregnant ? 'Yes' : 'No'}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8 animate-slide-in-right">
            {/* 3D Model Section */}
            <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100 overflow-hidden no-print-model">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <h2 className="text-xl font-black text-gray-800">3D Dental Model</h2>
                
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                  {['status', 'condition', 'treatment'].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                        viewMode === mode 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-[400px] w-full rounded-3xl bg-gray-50 border border-gray-100 relative overflow-hidden">
                <TeethModelViewer 
                  toothStates={toothStates}
                  selectedTeeth={selectedRecord ? selectedRecord.toothNumbers : []}
                  selectedRecord={selectedRecord}
                  timelineRecords={toothConditions}
                  viewMode={viewMode}
                />
              </div>
            </div>

            <div className="bg-white p-8 rounded-4xl shadow-sm border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveSection('appointments')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition hover:scale-105 ${activeSection === 'appointments' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                  >
                    Appointment History
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('treatments')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition hover:scale-105 ${activeSection === 'treatments' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-white'}`}
                  >
                    Treatment Records
                  </button>
                </div>
                <span className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-xs font-bold uppercase tracking-widest">
                  {(activeSection === 'appointments' ? filteredAppointments.length : toothConditions.length)} {(activeSection === 'appointments' ? filteredAppointments.length : toothConditions.length) === 1 ? 'record' : 'records'}
                </span>
              </div>

              {activeSection === 'appointments' ? (
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Search appointments</label>
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by service, name, or reference"
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl shadow-sm focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by service</label>
                      <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl bg-white focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none"
                      >
                        <option value="">All services</option>
                        {serviceOptions.map((service) => (
                          <option key={service} value={service}>{service}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by date</label>
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl bg-white focus:border-indigo-500 focus:ring-indigo-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600">
                    <p>Showing {filteredAppointments.length ? (currentPage - 1) * appointmentsPerPage + 1 : 0} – {Math.min(currentPage * appointmentsPerPage, filteredAppointments.length)} of {filteredAppointments.length} appointments</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {filteredAppointments.length > 0 && (
                        <button
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          className="rounded-full px-4 py-2 bg-gray-100 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-200 transition"
                        >
                          Previous
                        </button>
                      )}
                      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${currentPage === page ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          {page}
                        </button>
                      ))}
                      {filteredAppointments.length > 0 && (
                        <button
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          className="rounded-full px-4 py-2 bg-gray-100 text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-200 transition"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  </div>

                  {pagedAppointments.length ? (
                    pagedAppointments.map((appointment, index) => (
                      <div key={appointment.id} className="rounded-3xl border border-gray-100 p-4 bg-gray-50 hover:shadow-lg transition-all hover:scale-[1.02]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div>
                            <span className="text-xs font-bold uppercase text-gray-400">{(currentPage - 1) * appointmentsPerPage + index + 1}.</span>
                            <p className="text-sm text-gray-500 uppercase tracking-widest font-black mt-2">{appointment.serviceType || 'Appointment'}</p>
                            <p className="font-bold text-gray-800 mt-1">{appointment.scheduledDate || 'TBD'} • {appointment.scheduledTime || 'TBD'}</p>
                            <p className="text-sm text-gray-500 mt-2">{appointment.patientFullName || 'Patient'}</p>
                          </div>
                          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${appointment.status?.isScheduled === 'Scheduled' ? 'bg-emerald-100 text-emerald-700' : appointment.status?.isScheduled === 'Declined' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {appointment.status?.isScheduled || 'Pending'}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <p className="text-xs text-gray-500">Ref: {appointment.id}</p>
                          <Link to={`/track/${appointment.id}`} className="inline-flex w-full justify-center sm:w-auto rounded-full bg-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-indigo-700 transition-all hover:scale-105">
                            Track status
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No appointments match your filters. Try a different search or clear the filters.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {toothConditions.length ? (
                    toothConditions.map((record) => (
                      <div key={record.id} onClick={() => setSelectedRecord(record)} className={`p-6 border rounded-3xl transition-all cursor-pointer flex flex-col md:flex-row items-start gap-6 ${selectedRecord?.id === record.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                        <div className={`w-full md:w-[210px] rounded-2xl border p-4 ${selectedRecord?.id === record.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border-indigo-100 text-indigo-700'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${selectedRecord?.id === record.id ? 'text-indigo-100' : 'text-indigo-500'}`}>
                              Teeth
                            </p>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${selectedRecord?.id === record.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                              {record.toothNumbers.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {record.toothNumbers.length > 0 ? (
                              record.toothNumbers.map((toothNum) => (
                                <span
                                  key={`${record.id}-${toothNum}`}
                                  className={`min-w-9 h-8 px-2 rounded-lg flex items-center justify-center text-sm font-black ${selectedRecord?.id === record.id ? 'bg-white text-indigo-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                  {toothNum}
                                </span>
                              ))
                            ) : (
                              <span className={`text-xs font-bold ${selectedRecord?.id === record.id ? 'text-indigo-100' : 'text-indigo-400'}`}>
                                No teeth selected
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 flex-1 text-sm">
                          <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Date</p><p className="font-bold text-gray-700">{record.date}</p></div>
                          <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Condition</p><p className="font-bold text-gray-700 capitalize">{record.condition}</p></div>
                          <div><p className="text-[10px] text-gray-400 font-black uppercase mb-1">Procedure</p><p className="font-bold text-gray-700 capitalize">{record.procedure}</p></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No treatment records available yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
};

export default PatientPortal;
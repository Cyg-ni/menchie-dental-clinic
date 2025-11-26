// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCS-olCQRpJZGcYSGWG7CZ8PIpV-wBNaOE",
  authDomain: "menchie-dental-clinic.firebaseapp.com",
  projectId: "menchie-dental-clinic",
  storageBucket: "menchie-dental-clinic.firebasestorage.app",
  messagingSenderId: "1005995383687",
  appId: "1:1005995383687:web:42301faf7bbfcb544b1122",
  measurementId: "G-C96BVD0XY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Collections
const patientsCol = collection(db, "patients");
const appointmentsCol = collection(db, "appointments");
const treatmentsCol = collection(db, "treatments");

// Patients helpers
async function createPatient(patient) {
  // If caller supplied an `id` we use setDoc to create with that id, otherwise addDoc
  if (patient.id) {
    const ref = doc(db, "patients", String(patient.id));
    await setDoc(ref, { ...patient, updatedAt: serverTimestamp(), createdAt: patient.createdAt ? patient.createdAt : serverTimestamp() });
    return { id: String(patient.id), ...patient };
  }
  const res = await addDoc(patientsCol, { ...patient, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: res.id, ...patient };
}

async function updatePatient(id, changes) {
  const ref = doc(db, "patients", String(id));
  await updateDoc(ref, { ...changes, updatedAt: serverTimestamp() });
  const updated = await getDoc(ref);
  return updated.exists() ? { id: updated.id, ...updated.data() } : null;
}

async function getPatient(id) {
  const ref = doc(db, "patients", String(id));
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function listPatients(filter = {}) {
  const snap = await getDocs(patientsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function deletePatient(id) {
  const ref = doc(db, "patients", String(id));
  await deleteDoc(ref);
  return true;
}

function onPatientsSnapshot(callback) {
  return onSnapshot(patientsCol, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// Appointments helpers
async function createAppointment(appointment) {
  const res = await addDoc(appointmentsCol, { ...appointment, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return { id: res.id, ...appointment };
}

async function updateAppointment(id, changes) {
  const ref = doc(db, "appointments", String(id));
  await updateDoc(ref, { ...changes, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function listAppointmentsForPatient(patientId) {
  const q = query(appointmentsCol, where("patientId", "==", String(patientId)), orderBy("start", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function onAppointmentsSnapshot(callback, options = {}) {
  let q = appointmentsCol;
  if (options.patientId) q = query(appointmentsCol, where("patientId", "==", String(options.patientId)), orderBy("start", "desc"));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// Treatments helpers (catalog)
async function listTreatments() {
  const snap = await getDocs(treatmentsCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Exports
export {
  app,
  analytics,
  db,
  // patients
  createPatient,
  updatePatient,
  getPatient,
  listPatients,
  deletePatient,
  onPatientsSnapshot,
  // appointments
  createAppointment,
  updateAppointment,
  listAppointmentsForPatient,
  onAppointmentsSnapshot,
  // treatments
  listTreatments
};

async function migrateLocalPatients() {
  try {
    const raw = window.localStorage.getItem('patients');
    if (!raw) return { migrated: 0 };
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return { migrated: 0 };
    let migrated = 0;
    for (const p of arr) {
      try {
        await createPatient(p);
        migrated++;
      } catch (err) {
        console.warn('Failed to migrate patient', p, err);
      }
    }
    return { migrated };
  } catch (err) {
    console.error('migration failed', err);
    return { migrated: 0, error: String(err) };
  }
}

export { migrateLocalPatients };
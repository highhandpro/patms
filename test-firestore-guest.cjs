const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCVaVEwiC69k0EGqRVlv7t54igJodYyMi0",
  authDomain: "patms-790b9.firebaseapp.com",
  projectId: "patms-790b9",
  storageBucket: "patms-790b9.firebasestorage.app",
  messagingSenderId: "62086730368",
  appId: "1:62086730368:web:d7810bc35ce7d3d9b58c65"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Attempting write to members...");
    await setDoc(doc(db, 'members', 'test-guest-id-999'), {
      id: 'test-guest-id-999',
      firstName: 'Test',
      lastName: 'Guest',
      phone: '1234567890',
      email: 'test@guest.com',
      joinedDate: '2026-07-14',
      isDeleted: false,
      notes: 'Test Guest',
      logoUrl: '',
      pin: ''
    });
    console.log("Members write SUCCESS!");

    console.log("Attempting write to pendingApprovals...");
    await setDoc(doc(db, 'pendingApprovals', 'test-app-id-999'), {
      id: 'test-app-id-999',
      type: 'guest',
      memberId: 'test-guest-id-999',
      firstName: 'Test',
      lastName: 'Guest',
      phone: '1234567890',
      email: 'test@guest.com',
      timestamp: new Date().toISOString()
    });
    console.log("PendingApprovals write SUCCESS!");
  } catch (err) {
    console.error("Firestore error:", err);
  }
}

test();

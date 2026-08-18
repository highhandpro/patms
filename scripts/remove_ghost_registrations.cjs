const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function main() {
  // 1. Get all valid member IDs
  const membersSnap = await getDocs(collection(db, 'members'));
  const validMemberIds = new Set();
  membersSnap.forEach(doc => {
    validMemberIds.add(doc.id);
  });
  console.log(`Fetched ${validMemberIds.size} valid members.`);

  // 2. Get all tournaments
  const tourSnap = await getDocs(collection(db, 'tournaments'));
  console.log(`Fetched ${tourSnap.size} tournaments. Checking for ghost entries...`);

  for (const docSnap of tourSnap.docs) {
    const data = docSnap.data();
    const tourId = docSnap.id;
    let needsUpdate = false;
    let updatedEntries = [...(data.entries || [])];
    let updatedDinnerReservations = [...(data.dinnerReservations || [])];

    // Filter entries
    const originalEntryCount = updatedEntries.length;
    updatedEntries = updatedEntries.filter(entry => {
      const isValid = validMemberIds.has(entry.memberId);
      if (!isValid) {
        console.log(`[Tournament: ${data.name}] Found ghost entry with memberId: ${entry.memberId}`);
        needsUpdate = true;
      }
      return isValid;
    });

    // Filter dinner reservations
    const originalDinnerCount = updatedDinnerReservations.length;
    updatedDinnerReservations = updatedDinnerReservations.filter(memberId => {
      const isValid = validMemberIds.has(memberId);
      if (!isValid) {
        console.log(`[Tournament: ${data.name}] Found ghost dinner reservation with memberId: ${memberId}`);
        needsUpdate = true;
      }
      return isValid;
    });

    if (needsUpdate) {
      console.log(`Updating Tournament ${data.name} (${tourId}):`);
      console.log(`  - Entries: ${originalEntryCount} -> ${updatedEntries.length}`);
      console.log(`  - Dinner RSVPs: ${originalDinnerCount} -> ${updatedDinnerReservations.length}`);
      
      const tourDocRef = doc(db, 'tournaments', tourId);
      await updateDoc(tourDocRef, {
        entries: updatedEntries,
        dinnerReservations: updatedDinnerReservations
      });
      console.log(`Tournament ${data.name} updated successfully.`);
    }
  }

  console.log("Database sanitization complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Error running script:", err);
  process.exit(1);
});

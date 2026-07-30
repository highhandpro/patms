const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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

const COLLECTIONS = ['members', 'tournaments', 'seasons', 'settings', 'pendingApprovals'];

async function runBackup() {
  console.log("Starting Firestore backup...");
  const backupData = {};

  try {
    for (const collName of COLLECTIONS) {
      console.log(`Fetching collection: ${collName}...`);
      const collRef = collection(db, collName);
      const snapshot = await getDocs(collRef);
      
      backupData[collName] = [];
      snapshot.forEach(doc => {
        backupData[collName].push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log(`Fetched ${backupData[collName].length} documents from ${collName}.`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `patms_backup_${timestamp}.json`;
    const backupFilePath = path.join(__dirname, '..', backupFileName);

    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
    console.log(`Backup completed successfully! Saved to: ${backupFileName}`);
  } catch (error) {
    console.error("Backup failed with error:", error);
  }
}

runBackup();

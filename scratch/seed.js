const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC81AvHn8JS5k4C1vYp2l8o1-5219QL1qw",
  authDomain: "mywhiskey-97620.firebaseapp.com",
  projectId: "mywhiskey-97620",
  storageBucket: "mywhiskey-97620.firebasestorage.app",
  messagingSenderId: "80580144561",
  appId: "1:80580144561:web:dd04247b830dad39fa6190",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_CAPTAINS = [
  {
    id: 'captain-sarah-vance',
    slug: 'captain-sarah-vance',
    title: 'Captain Sarah Vance',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 450,
    hourlyRate: 75,
    heroImage: '/images/crew/captain-sarah-vance.png',
    shortDescription: 'USCG 100 Ton Master with over a decade of charter experience in the Destin area.',
    location: 'Destin, FL',
    bio: 'Captain Sarah Vance has been navigating the emerald waters of the Gulf Coast since she was a teenager. Certified with a USCG 100 Ton Master license, she is known for her exceptional safety record and deep knowledge of local sandbars, snorkeling spots, and dolphin habitats.',
    certifications: ['USCG 100 Ton Master', 'First Aid & CPR', 'STCW-95'],
    languagesSpoken: ['English'],
    status: 'published'
  },
  {
    id: 'captain-marcus-brody',
    slug: 'captain-marcus-brody',
    title: 'Captain Marcus Brody',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 500,
    hourlyRate: 85,
    heroImage: '/images/crew/captain-marcus-brody.png',
    shortDescription: 'USCG 200 Ton Master and deep-sea fishing specialist with 15+ years of offshore experience.',
    location: 'Destin Harbor, FL',
    bio: 'Captain Marcus Brody is a seasoned offshore captain and tournament-winning angler. He specializes in deep-sea charters and coastal navigation, bringing a wealth of marine mechanical knowledge and local fishing lore to every charter.',
    certifications: ['USCG 200 Ton Master', 'STCW-95', 'Marine Firefighting', 'CPR & AED'],
    languagesSpoken: ['English'],
    status: 'published'
  },
  {
    id: 'captain-david-chen',
    slug: 'captain-david-chen',
    title: 'Captain David Chen',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 400,
    hourlyRate: 65,
    heroImage: '/images/crew/captain-david-chen.png',
    shortDescription: 'USCG 50 Ton Master and professional yacht host. Speaks English and Mandarin.',
    location: 'Destin, FL',
    bio: 'Captain David Chen combines technical maritime skills with hospitality expertise. Prior to private chartering, David worked in luxury guest services, making him the perfect captain for high-end corporate charters and relaxing family days.',
    certifications: ['USCG 50 Ton Master', 'First Aid & CPR'],
    languagesSpoken: ['English', 'Mandarin'],
    status: 'published'
  },
  {
    id: 'captain-elena-rostova',
    slug: 'captain-elena-rostova',
    title: 'Captain Elena Rostova',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 450,
    hourlyRate: 75,
    heroImage: '/images/crew/captain-elena-rostova.png',
    shortDescription: 'USCG 100 Ton Master and certified divemaster with a passion for marine conservation.',
    location: 'Destin Marina, FL',
    bio: 'Captain Elena Rostova has sailed across the Atlantic and throughout the Caribbean. As a licensed captain and PADI Divemaster, Elena offers charters that can explore both the surface and the depths of the Gulf Coast.',
    certifications: ['USCG 100 Ton Master', 'PADI Divemaster', 'STCW-95', 'Emergency First Responder'],
    languagesSpoken: ['English', 'Russian', 'Spanish'],
    status: 'published'
  },
  {
    id: 'captain-robert-miller',
    slug: 'captain-robert-miller',
    title: 'Captain Robert "Red" Miller',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 550,
    hourlyRate: 95,
    heroImage: '/images/crew/captain-robert-miller.png',
    shortDescription: 'USCG 500 Ton Master with 25+ years of ocean command experience.',
    location: 'Destin, FL',
    bio: 'Captain Robert "Red" Miller is the most senior captain in our network. With over 25 years of command on large yachts and commercial vessels, his experience, professionalism, and calming presence ensure the highest standard of luxury and safety.',
    certifications: ['USCG 500 Ton Master', 'STCW-95', 'GMDSS Radio Operator', 'Radar Observer'],
    languagesSpoken: ['English'],
    status: 'published'
  }
];

async function seed() {
  console.log('Seeding captains with new heroImage links...');
  for (const captain of MOCK_CAPTAINS) {
    const docId = `content-item-${captain.slug}`;
    const docRef = doc(db, 'pages', docId);
    await setDoc(docRef, {
      ...captain,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Updated ${captain.title}`);
  }
  console.log('Seed completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

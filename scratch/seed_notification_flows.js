const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse CLI Arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) {
    args[match[1]] = match[2];
  }
});

const keyPath = args['key'];
const projectId = args['project'] || 'my-whiskey-prod';

if (!keyPath) {
  console.error('Error: Please provide a service account JSON file path.');
  console.log('\nUsage:');
  console.log('  node scratch/seed_notification_flows.js --key="path/to/prod-key.json"');
  process.exit(1);
}

const keyFile = path.resolve(keyPath);
if (!fs.existsSync(keyFile)) {
  console.error(`Error: Service account file not found at ${keyFile}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Default templates to seed
const DEFAULT_TEMPLATES = [
  {
    id: 'booking_confirmed_email',
    name: 'Booking Confirmation Email',
    channel: 'email',
    subject: 'Your Voyage on M/Y Whiskey is Confirmed! (ID: {{bookingId}})',
    body: `Dear {{guestName}},

We are pleased to confirm your private bareboat charter reservation. Below are the details of your upcoming luxury experience.

* **Booking ID:** {{bookingId}}
* **Experience:** {{experienceTitle}}
* **Vessel:** {{vesselTitle}}
* **Date:** {{date}}
* **Time:** {{startTime}}

### Financial Summary
* **Grand Total:** {{grandTotal}}
* **Paid Today:** {{amountPaidToday}}
* **Remaining Balance:** {{amountDueLater}}

Federal regulations require all charter passengers to sign the bareboat release waiver prior to boarding. Please log into your guest portal to register passengers and sign waivers.`,
  },
  {
    id: 'waiver_reminder_sms',
    name: 'Initial Waiver Request SMS',
    channel: 'sms',
    body: 'M/Y Whiskey Voyage Confirmed! ID: {{bookingId}}. Date: {{date}} at {{startTime}}. Complete your digital release waiver here: {{portalUrl}}',
  },
  {
    id: 'waiver_request_email',
    name: 'Waiver Reminder Email',
    channel: 'email',
    subject: 'Action Required: Sign Passenger Liability Waiver (ID: {{bookingId}})',
    body: `Dear {{guestName}},

In preparation for your upcoming voyage, **federal maritime regulations require all charter passengers to sign our liability waiver prior to boarding**.

Please click the button below to sign your digital passenger waiver. If you have guests joining you, you can also add their names and send them their unique signing links from your portal.

* **Voyage ID:** {{bookingId}}
* **Experience:** {{experienceTitle}}
* **Vessel:** {{vesselTitle}}
* **Charter Date:** {{date}}

*Note: Boarding will be delayed if passenger manifests are incomplete or missing signatures at the dock.*`,
  },
  {
    id: 'trip_reminder_email_7d',
    name: '7-Day Pre-Voyage Checklist Email',
    channel: 'email',
    subject: '7-Day Pre-Voyage Checklist - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

We look forward to welcoming you on board **M/Y Whiskey** in Destin! To ensure a seamless boarding experience, please review the vital departure information below.

* **Date:** {{date}}
* **Departure Time:** {{startTime}}
* **Boarding Port:** {{startLocationName}}
* **Hired Captain:** {{captainTitle}}

### Pre-Boarding Checklist:
* **Arrival Time:** Please arrive **15 minutes prior** to departure. Late arrivals will shorten your charter duration.
* **Digital Waivers:** Verify in your portal that all guest signatures are complete.
* **What to Bring:** Towels, sunscreen (non-spray preferred to protect boat upholstery), sunglasses, food/drinks, and dry clothing.
* **Prohibited Items:** Red wine (stains deck), black-soled shoes, spray sunscreen, drugs/marijuana (illegal under USCG regulations).`,
  },
  {
    id: 'trip_reminder_sms_7d',
    name: '7-Day Pre-Voyage Reminder SMS',
    channel: 'sms',
    body: 'M/Y Whiskey: 7 days until your voyage! Please review your boarding checklist and waivers: {{portalUrl}}',
  },
  {
    id: 'trip_reminder_email_24h',
    name: '24-Hour Boarding Instructions Email',
    channel: 'email',
    subject: 'Important: 24-Hour Boarding Instructions - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

Your voyage departs tomorrow! Please find your boarding instructions below.

* **Departure Time:** {{startTime}}
* **Boarding Location:** {{startLocationName}}
* **Hired Captain:** {{captainTitle}}

Please meet at the designated slip 15 minutes before your scheduled departure time. Your captain will greet you at the dock. Ensure all guest waivers are signed today.`,
  },
  {
    id: 'trip_reminder_sms_24h',
    name: '24-Hour Boarding Instructions SMS',
    channel: 'sms',
    body: 'M/Y Whiskey departure tomorrow at {{startTime}}! Meet at {{startLocationName}}. Check details and direction: {{portalUrl}}',
  },
  {
    id: 'waiver_signed_email',
    name: 'Waiver Signed Confirmation Email',
    channel: 'email',
    subject: 'Waiver Signature Confirmed - Booking #{{bookingId}}',
    body: `Dear {{guestName}},

This email confirms that the digital passenger release waiver for your charter booking **#{{bookingId}}** has been successfully signed and logged.

Your voyage is scheduled for **{{date}}** at **{{startTime}}**. 

You can view your trip checklist and chat with the crew anytime in your portal.`,
  }
];

// Default flows to seed
const DEFAULT_FLOWS = [
  {
    id: 'standard_bareboat_flow',
    trigger: 'booking_created',
    steps: [
      {
        id: 'step_1_confirmation_email',
        templateId: 'booking_confirmed_email',
        offsetType: 'instant',
        offsetValue: 0,
        offsetUnit: 'minutes'
      },
      {
        id: 'step_2_initial_waiver_sms',
        templateId: 'waiver_reminder_sms',
        offsetType: 'instant',
        offsetValue: 0,
        offsetUnit: 'minutes'
      },
      {
        id: 'step_3_waiver_nudge_email',
        templateId: 'waiver_request_email',
        offsetType: 'delay_after_trigger',
        offsetValue: 3,
        offsetUnit: 'days',
        condition: 'waiverSigned == false'
      },
      {
        id: 'step_4_7d_checklist_email',
        templateId: 'trip_reminder_email_7d',
        offsetType: 'before_trip',
        offsetValue: 7,
        offsetUnit: 'days'
      },
      {
        id: 'step_5_7d_checklist_sms',
        templateId: 'trip_reminder_sms_7d',
        offsetType: 'before_trip',
        offsetValue: 7,
        offsetUnit: 'days'
      },
      {
        id: 'step_6_24h_boarding_email',
        templateId: 'trip_reminder_email_24h',
        offsetType: 'before_trip',
        offsetValue: 1,
        offsetUnit: 'days'
      },
      {
        id: 'step_7_24h_boarding_sms',
        templateId: 'trip_reminder_sms_24h',
        offsetType: 'before_trip',
        offsetValue: 1,
        offsetUnit: 'days'
      }
    ]
  }
];

async function seed() {
  console.log('Seeding notification templates...');
  for (const t of DEFAULT_TEMPLATES) {
    const docRef = db.collection('notification_templates').doc(t.id);
    await docRef.set({
      ...t,
      updatedAt: new Date().toISOString()
    });
    console.log(`  Seeded template: ${t.id}`);
  }

  console.log('\nSeeding notification flows...');
  for (const f of DEFAULT_FLOWS) {
    const docRef = db.collection('notification_flows').doc(f.id);
    await docRef.set({
      ...f,
      updatedAt: new Date().toISOString()
    });
    console.log(`  Seeded flow: ${f.id}`);
  }

  console.log('\nDatabase Seeding Completed Successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

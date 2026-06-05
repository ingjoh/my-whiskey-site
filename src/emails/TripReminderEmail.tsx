import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Button,
  Hr,
  Row,
  Column,
  Preview,
} from '@react-email/components';

interface TripReminderProps {
  bookingId?: string;
  guestName?: string;
  experienceTitle?: string;
  date?: string;
  startTime?: string;
  captainTitle?: string;
  startLocationName?: string;
  portalUrl?: string;
}

export default function TripReminder({
  bookingId = 'BK-123456',
  guestName = 'Valued Guest',
  experienceTitle = 'Destin Sunset Voyage',
  date = 'June 15, 2026',
  startTime = '6:00 PM',
  captainTitle = 'Captain Sarah Vance',
  startLocationName = 'Destin Harbor Dock A, FL',
  portalUrl = 'https://motoryachtwhiskey.com/guest/portal',
}: TripReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Important: Pre-Voyage Checklist & Boarding Details for booking {bookingId}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={logoText}>M/Y WHISKEY</Heading>
            <Text style={subtitle}>PRIVATE BAREBOAT CHARTERS</Text>
          </Section>

          {/* Card */}
          <Section style={card}>
            <Heading style={cardHeading}>Your Voyage Checklist</Heading>
            <Text style={paragraph}>
              Dear {guestName},
            </Text>
            <Text style={paragraph}>
              We look forward to welcoming you on board **M/Y Whiskey** in Destin! To ensure a seamless boarding experience, please review the vital departure information below.
            </Text>

            {/* Departure Info Box */}
            <Section style={gridContainer}>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Date</Text></Column>
                <Column style={gridColRight}><Text style={value}>{date}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Departure Time</Text></Column>
                <Column style={gridColRight}><Text style={value}>{startTime}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Boarding Port</Text></Column>
                <Column style={gridColRight}><Text style={value}>{startLocationName}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Hired Captain</Text></Column>
                <Column style={gridColRight}><Text style={value}>{captainTitle}</Text></Column>
              </Row>
            </Section>

            {/* Checklist Section */}
            <Heading style={sectionTitle}>Pre-Boarding Checklist</Heading>
            <Text style={bulletPoint}>✓ **Arrival Time:** Please arrive **15 minutes prior** to departure. Late arrivals will shorten your charter duration.</Text>
            <Text style={bulletPoint}>✓ **Digital Waivers:** Verify in your portal that all guest signatures are complete.</Text>
            <Text style={bulletPoint}>✓ **What to Bring:** Towels, sunscreen (non-spray preferred to protect boat upholstery), sunglasses, food/drinks, and dry clothing.</Text>
            <Text style={bulletPoint}>❌ **Prohibited Items:** Red wine (stains deck), black-soled shoes, spray sunscreen, drugs/marijuana (illegal under USCG regulations).</Text>

            {/* Action Call */}
            <Section style={actionContainer}>
              <Button href={portalUrl} style={button}>
                Open Guest Portal
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={captainAlert}>
              ⚓ **Skipper Notice:** Your hired captain, **{captainTitle}**, will contact you shortly to review the float plan. If you need to make special catering or boarding adjustments, please use the messenger inside your guest portal.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              M/Y Whiskey • Destin Harbor, Destin, FL
            </Text>
            <Text style={footerText}>
              Need directions? Message us at <Link href="mailto:concierge@motoryachtwhiskey.com" style={footerLink}>concierge@motoryachtwhiskey.com</Link>
            </Text>
            <Text style={footerDisclaimer}>
              This is a transactional trip operational update sent in connection with your active reservation.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styling Constants
const main = {
  backgroundColor: '#121416',
  color: '#F4F1EA',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  padding: '20px 0',
};

const container = {
  maxWidth: '580px',
  margin: '0 auto',
  padding: '0 10px',
};

const headerSection = {
  textAlign: 'center' as const,
  padding: '30px 0 20px 0',
};

const logoText = {
  fontSize: '24px',
  fontWeight: '700',
  letterSpacing: '0.15em',
  color: '#FFFFFF',
  margin: '0 0 5px 0',
  fontFamily: "Georgia, serif",
};

const subtitle = {
  fontSize: '10px',
  fontWeight: '600',
  letterSpacing: '0.25em',
  color: '#B9783B',
  margin: '0',
};

const card = {
  background: '#1E2124',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '35px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
};

const cardHeading = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#FFFFFF',
  fontFamily: "Georgia, serif",
  margin: '0 0 20px 0',
  borderBottom: '1px solid rgba(185, 120, 59, 0.25)',
  paddingBottom: '10px',
};

const paragraph = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#D8C7AF',
  margin: '0 0 15px 0',
};

const gridContainer = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  borderRadius: '8px',
  padding: '15px 20px',
  margin: '20px 0',
};

const gridRow = {
  padding: '6px 0',
};

const gridColLeft = {
  width: '35%',
  textAlign: 'left' as const,
};

const gridColRight = {
  width: '65%',
  textAlign: 'right' as const,
};

const label = {
  fontSize: '12px',
  fontWeight: '500',
  color: '#D8C7AF',
  opacity: '0.7',
  margin: '0',
};

const value = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#FFFFFF',
  margin: '0',
};

const sectionTitle = {
  fontSize: '16px',
  fontWeight: '700',
  color: '#FFFFFF',
  margin: '20px 0 10px 0',
  fontFamily: "Georgia, serif",
};

const bulletPoint = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: '#D8C7AF',
  margin: '0 0 8px 0',
};

const divider = {
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  margin: '25px 0',
};

const actionContainer = {
  textAlign: 'center' as const,
  marginTop: '25px',
  marginBottom: '10px',
};

const button = {
  backgroundColor: '#B9783B',
  borderRadius: '6px',
  color: '#FFFFFF',
  fontSize: '13px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  boxShadow: '0 4px 10px rgba(185, 120, 59, 0.3)',
};

const captainAlert = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#D8C7AF',
  opacity: '0.95',
  margin: '0',
};

const footerSection = {
  textAlign: 'center' as const,
  padding: '30px 0',
};

const footerText = {
  fontSize: '11px',
  color: '#D8C7AF',
  opacity: '0.6',
  margin: '0 0 6px 0',
};

const footerLink = {
  color: '#B9783B',
  textDecoration: 'underline',
};

const footerDisclaimer = {
  fontSize: '9px',
  color: '#D8C7AF',
  opacity: '0.4',
  margin: '15px 0 0 0',
  lineHeight: '1.3',
};

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

interface WaiverRequestProps {
  bookingId?: string;
  guestName?: string;
  experienceTitle?: string;
  vesselTitle?: string;
  date?: string;
  portalUrl?: string;
}

export default function WaiverRequest({
  bookingId = 'BK-123456',
  guestName = 'Valued Guest',
  experienceTitle = 'Destin Sunset Voyage',
  vesselTitle = 'M/Y Whiskey (70ft)',
  date = 'June 15, 2026',
  portalUrl = 'https://motoryachtwhiskey.com/guest/portal',
}: WaiverRequestProps) {
  return (
    <Html>
      <Head />
      <Preview>Action Required: Please sign the passenger liability waiver for your upcoming charter.</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Heading style={logoText}>M/Y WHISKEY</Heading>
            <Text style={subtitle}>PRIVATE BAREBOAT CHARTERS</Text>
          </Section>

          {/* Card */}
          <Section style={card}>
            <Heading style={cardHeading}>Signature Required: Passenger Waiver</Heading>
            <Text style={paragraph}>
              Dear {guestName},
            </Text>
            <Text style={paragraph}>
              In preparation for your upcoming voyage, **federal maritime regulations require all charter passengers to sign our liability waiver prior to boarding**.
            </Text>
            <Text style={paragraph}>
              Please take 2 minutes to complete your digital signature. If you have guests joining you, you can also easily add their names and send them their unique signing links from your portal.
            </Text>

            {/* Trip Details Summary */}
            <Section style={gridContainer}>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Voyage ID</Text></Column>
                <Column style={gridColRight}><Text style={value}>{bookingId}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Experience</Text></Column>
                <Column style={gridColRight}><Text style={value}>{experienceTitle}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Vessel</Text></Column>
                <Column style={gridColRight}><Text style={value}>{vesselTitle}</Text></Column>
              </Row>
              <Row style={gridRow}>
                <Column style={gridColLeft}><Text style={label}>Charter Date</Text></Column>
                <Column style={gridColRight}><Text style={value}>{date}</Text></Column>
              </Row>
            </Section>

            {/* Action Call */}
            <Section style={actionContainer}>
              <Button href={portalUrl} style={button}>
                Sign Digital Passenger Waiver
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={noticeText}>
              ℹ️ **Important Notice:** Boarding will be delayed if any passenger manifests are incomplete or missing signatures at the dock. We appreciate your cooperation in helping us ensure a safe and timely departure!
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              M/Y Whiskey • Destin Harbor, Destin, FL
            </Text>
            <Text style={footerText}>
              Questions? Contact us at <Link href="mailto:concierge@motoryachtwhiskey.com" style={footerLink}>concierge@motoryachtwhiskey.com</Link>
            </Text>
            <Text style={footerDisclaimer}>
              This is a safety and regulatory notification sent in connection with your active charter reservation.
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

const noticeText = {
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

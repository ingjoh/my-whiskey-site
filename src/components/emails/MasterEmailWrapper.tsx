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
  Img,
  Preview,
} from '@react-email/components';

interface MasterEmailWrapperProps {
  previewText?: string;
  logoUrl?: string;
  primaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  foregroundColor?: string;
  mutedColor?: string;
  children: React.ReactNode;
}

export default function MasterEmailWrapper({
  previewText = '',
  logoUrl = '',
  primaryColor = '#B9783B',
  backgroundColor = '#121416',
  surfaceColor = '#1E2124',
  foregroundColor = '#F4F1EA',
  mutedColor = '#D8C7AF',
  children,
}: MasterEmailWrapperProps) {
  return (
    <Html>
      <Head />
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{
        backgroundColor,
        color: foregroundColor,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        padding: '20px 0',
        margin: '0',
      }}>
        <Container style={{
          maxWidth: '580px',
          margin: '0 auto',
          padding: '0 10px',
        }}>
          {/* Header */}
          <Section style={{
            textAlign: 'center' as const,
            padding: '30px 0 20px 0',
          }}>
            {logoUrl ? (
              <Img src={logoUrl} alt="M/Y Whiskey Logo" style={{ maxHeight: '48px', margin: '0 auto', display: 'block' }} />
            ) : (
              <Heading style={{
                fontSize: '24px',
                fontWeight: '700',
                letterSpacing: '0.15em',
                color: '#FFFFFF',
                margin: '0 0 5px 0',
                fontFamily: 'Georgia, serif',
              }}>
                M/Y WHISKEY
              </Heading>
            )}
            <Text style={{
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.25em',
              color: primaryColor,
              margin: '0',
            }}>
              PRIVATE BAREBOAT CHARTERS
            </Text>
          </Section>

          {/* Card Body content */}
          <Section style={{
            background: surfaceColor,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '35px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{
            textAlign: 'center' as const,
            padding: '30px 0',
          }}>
            <Text style={{
              fontSize: '11px',
              color: mutedColor,
              opacity: '0.6',
              margin: '0 0 6px 0',
            }}>
              M/Y Whiskey • Destin Harbor, Destin, FL
            </Text>
            <Text style={{
              fontSize: '11px',
              color: mutedColor,
              opacity: '0.6',
              margin: '0 0 6px 0',
            }}>
              Need assistance? Email us at <Link href="mailto:concierge@motoryachtwhiskey.com" style={{ color: primaryColor, textDecoration: 'underline' }}>concierge@motoryachtwhiskey.com</Link>
            </Text>
            <Text style={{
              fontSize: '9px',
              color: mutedColor,
              opacity: '0.4',
              margin: '15px 0 0 0',
              lineHeight: '1.3',
            }}>
              This is a transactional message sent in connection with your charter voyage.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

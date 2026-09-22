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
  Hr,
  Row,
  Column,
} from '@react-email/components';
import { BookingReceiptData } from '@/lib/receipt';

interface BookingConfirmationReceiptEmailProps {
  data: BookingReceiptData;
}

const formatCurrency = (val: number) => {
  return `$${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BookingConfirmationReceiptEmail({ data }: BookingConfirmationReceiptEmailProps) {
  const primaryColor = data.branding?.primaryColor || '#B9783B';
  const backgroundColor = data.branding?.backgroundColor || '#121416';
  const surfaceColor = data.branding?.surfaceColor || '#1E2124';
  const cardBorder = '1px solid rgba(255, 255, 255, 0.1)';
  const mutedColor = '#D8C7AF';

  return (
    <Html>
      <Head />
      <Preview>{`Voyage Confirmed (${data.formattedBookingId}): ${data.experienceTitle} on ${data.formattedDate}`}</Preview>
      <Body style={{
        backgroundColor,
        color: '#F4F1EA',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        margin: 0,
        padding: '24px 0',
      }}>
        <Container style={{
          maxWidth: '620px',
          margin: '0 auto',
          padding: '0 12px',
        }}>

          {/* Header */}
          <Section style={{
            textAlign: 'center',
            padding: '24px 0 16px 0',
          }}>
            {data.branding?.logoUrl ? (
              <Img src={data.branding.logoUrl} alt="M/Y Whiskey" style={{ maxHeight: '46px', margin: '0 auto 8px auto', display: 'block' }} />
            ) : (
              <Heading style={{
                fontSize: '24px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#FFFFFF',
                margin: '0 0 4px 0',
                fontFamily: 'Georgia, serif',
              }}>
                M/Y WHISKEY
              </Heading>
            )}
            <Text style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: primaryColor,
              margin: '0',
              textTransform: 'uppercase',
            }}>
              Official Charter Confirmation & Payment Receipt
            </Text>
          </Section>

          {/* Status & Booking Hero Banner */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: cardBorder,
            borderRadius: '10px',
            padding: '28px',
            margin: '0 0 20px 0',
            textAlign: 'center',
          }}>
            <Text style={{
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 8px 0',
              textTransform: 'uppercase',
            }}>
              {data.paymentStatus === 'fully_paid' ? '✓ Charter Confirmed & Paid in Full' : '✓ Charter Confirmed (Deposit Paid)'}
            </Text>
            <Heading style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 10px 0',
              fontFamily: 'Georgia, serif',
            }}>
              {data.experienceTitle}
            </Heading>
            <Text style={{
              fontSize: '14px',
              color: mutedColor,
              margin: '0 0 18px 0',
              lineHeight: '1.5',
            }}>
              Dear {data.guest.name}, thank you for choosing M/Y Whiskey. We are preparing for your voyage along Florida's Emerald Coast. Below is your official charter itinerary and itemized payment receipt.
            </Text>

            <table width="100%" style={{ borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '6px' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: mutedColor, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Booking Reference:</td>
                  <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace' }}>{data.formattedBookingId}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: mutedColor, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Charter Date:</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{data.formattedDate}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: mutedColor, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Scheduled Departure:</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: primaryColor, textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{data.startTime} ({data.duration})</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 14px', fontSize: '13px', color: mutedColor }}>Party Size:</td>
                  <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: '#FFFFFF', textAlign: 'right' }}>{data.guest.guestCount} {data.guest.guestCount === 1 ? 'Passenger' : 'Passengers'}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CARD 1: THE VESSEL */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: cardBorder,
            borderRadius: '10px',
            padding: '24px',
            margin: '0 0 20px 0',
          }}>
            {data.vessel.imageUrl && (
              <Img
                src={data.vessel.imageUrl}
                alt={data.vessel.title}
                width="100%"
                height="180"
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'block',
                }}
              />
            )}
            <Text style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}>
              The Vessel
            </Text>
            <Heading style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 4px 0',
              fontFamily: 'Georgia, serif',
            }}>
              {data.vessel.title} • {data.vessel.model}
            </Heading>
            {data.vessel.tagline && (
              <Text style={{
                fontSize: '12px',
                fontStyle: 'italic',
                color: primaryColor,
                fontWeight: 600,
                margin: '0 0 8px 0',
              }}>
                "{data.vessel.tagline}"
              </Text>
            )}
            <Text style={{
              fontSize: '13px',
              color: mutedColor,
              margin: '0 0 16px 0',
              lineHeight: '1.5',
            }}>
              {data.vessel.description}
            </Text>

            <table width="100%" style={{ borderCollapse: 'collapse', marginBottom: '14px' }}>
              <tbody>
                <tr>
                  <td style={{ fontSize: '12px', color: '#FFFFFF', padding: '4px 0' }}>⚓ <strong>Length:</strong> {data.vessel.length}</td>
                  <td style={{ fontSize: '12px', color: '#FFFFFF', padding: '4px 0' }}>👥 <strong>Capacity:</strong> {data.vessel.capacity}</td>
                </tr>
              </tbody>
            </table>

            <table width="100%" style={{ borderCollapse: 'collapse', backgroundColor: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
              <tbody>
                {data.vessel.features.map((feat, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '12px', color: mutedColor, padding: '4px 10px' }}>• {feat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* CARD 2: START LOCATION & BOARDING */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: cardBorder,
            borderRadius: '10px',
            padding: '24px',
            margin: '0 0 20px 0',
          }}>
            {data.location.imageUrl && (
              <Img
                src={data.location.imageUrl}
                alt={data.location.title}
                width="100%"
                height="180"
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'block',
                }}
              />
            )}
            <Text style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}>
              Departure & Boarding Location
            </Text>
            <Heading style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 4px 0',
              fontFamily: 'Georgia, serif',
            }}>
              {data.location.title}
            </Heading>
            <Text style={{
              fontSize: '13px',
              fontWeight: 600,
              color: primaryColor,
              margin: '0 0 8px 0',
            }}>
              {data.location.marina} • {data.location.address}
            </Text>
            {data.location.slip && (
              <Text style={{
                fontSize: '12px',
                color: '#FFFFFF',
                backgroundColor: 'rgba(185, 120, 59, 0.15)',
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '4px',
                margin: '0 0 14px 0',
                border: '1px solid rgba(185, 120, 59, 0.3)',
              }}>
                Dock Assignment: <strong>{data.location.slip}</strong>
              </Text>
            )}

            <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '6px', margin: '0 0 14px 0' }}>
              <Text style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                Arrival Protocol:
              </Text>
              <Text style={{ fontSize: '12px', color: mutedColor, margin: '0 0 8px 0', lineHeight: '1.5' }}>
                {data.location.arrivalInstructions}
              </Text>
              <Text style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', margin: '0 0 4px 0' }}>
                Parking Info:
              </Text>
              <Text style={{ fontSize: '12px', color: mutedColor, margin: '0', lineHeight: '1.5' }}>
                {data.location.parkingInstructions}
              </Text>
            </div>

            <Link href={data.location.mapUrl} target="_blank" style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 600,
              color: primaryColor,
              textDecoration: 'underline',
            }}>
              📍 Open Location in Google Maps →
            </Link>
          </Section>

          {/* CARD 3: ASSIGNED CAPTAIN */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: cardBorder,
            borderRadius: '10px',
            padding: '24px',
            margin: '0 0 20px 0',
          }}>
            {data.captain.avatarUrl && (
              <Img
                src={data.captain.avatarUrl}
                alt={data.captain.name}
                width="100%"
                height="180"
                style={{
                  width: '100%',
                  height: '180px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'block',
                }}
              />
            )}
            <Text style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}>
              Trip Leadership & Master
            </Text>
            <Heading style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 4px 0',
              fontFamily: 'Georgia, serif',
            }}>
              {data.captain.name}
            </Heading>
            <Text style={{
              fontSize: '13px',
              fontWeight: 600,
              color: primaryColor,
              margin: '0 0 10px 0',
            }}>
              {data.captain.title}
            </Text>
            <Text style={{
              fontSize: '12px',
              color: mutedColor,
              margin: '0 0 10px 0',
              lineHeight: '1.5',
            }}>
              {data.captain.credentials}
            </Text>
            {data.captain.bio && (
              <Text style={{
                fontSize: '12px',
                color: mutedColor,
                opacity: 0.85,
                margin: '0 0 12px 0',
                fontStyle: 'italic',
                lineHeight: '1.4',
              }}>
                "{data.captain.bio}"
              </Text>
            )}
            <Text style={{
              fontSize: '11px',
              color: mutedColor,
              margin: 0,
            }}>
              Dockside Master Contact: <strong style={{ color: '#FFFFFF' }}>{data.captain.phone}</strong>
            </Text>
          </Section>

          {/* ITEMIZED PAYMENT RECEIPT LEDGER */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: cardBorder,
            borderRadius: '10px',
            padding: '28px',
            margin: '0 0 24px 0',
          }}>
            <Text style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}>
              Payment Receipt Ledger
            </Text>
            <Heading style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 18px 0',
              fontFamily: 'Georgia, serif',
            }}>
              Itemized Charges & Settlement
            </Heading>

            <table width="100%" style={{ borderCollapse: 'collapse', textAlign: 'left', marginBottom: '16px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)' }}>
                  <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 700, color: mutedColor, textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 700, color: mutedColor, textAlign: 'right', textTransform: 'uppercase' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF' }}>
                    <strong>{data.experienceTitle}</strong>
                    <div style={{ fontSize: '11px', color: mutedColor }}>Base Private Bareboat Charter ({data.duration})</div>
                  </td>
                  <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(data.financials.subtotal)}
                  </td>
                </tr>

                {data.financials.cancellationInsurance && (
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF' }}>
                      <strong>Weather & Cancellation Protection</strong>
                      <div style={{ fontSize: '11px', color: mutedColor }}>Flexible reschedule & refund guarantee</div>
                    </td>
                    <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF', textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(data.financials.insuranceAmount)}
                    </td>
                  </tr>
                )}

                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF' }}>
                    <strong>Florida Port & Statutory Taxes</strong>
                    <div style={{ fontSize: '11px', color: mutedColor }}>Applicable state, county & marina dockage tax</div>
                  </td>
                  <td style={{ padding: '12px 4px', fontSize: '13px', color: '#FFFFFF', textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(data.financials.salesTax)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.2)' }}>
                  <td style={{ padding: '14px 4px', fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                    CHARTER GRAND TOTAL
                  </td>
                  <td style={{ padding: '14px 4px', fontSize: '16px', fontWeight: 700, color: '#FFFFFF', textAlign: 'right' }}>
                    {formatCurrency(data.financials.grandTotal)}
                  </td>
                </tr>

                {/* Amount Paid Row */}
                <tr style={{ backgroundColor: 'rgba(112, 140, 132, 0.12)' }}>
                  <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 700, color: '#708C84' }}>
                    ✓ AMOUNT PAID ({data.financials.paymentMethod})
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '15px', fontWeight: 700, color: '#708C84', textAlign: 'right' }}>
                    {formatCurrency(data.financials.amountPaidToday)}
                  </td>
                </tr>

                {/* Balance Due if applicable */}
                {data.financials.amountDueLater > 0 && (
                  <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                      REMAINING BALANCE DUE
                      {data.financials.balanceDueDate && (
                        <div style={{ fontSize: '11px', fontWeight: 400, color: mutedColor }}>Due 7 days prior to excursion ({data.financials.balanceDueDate})</div>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '15px', fontWeight: 700, color: '#EF4444', textAlign: 'right' }}>
                      {formatCurrency(data.financials.amountDueLater)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Transaction metadata */}
            <div style={{ padding: '10px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {data.financials.stripePaymentIntentId && (
                <Text style={{ fontSize: '10px', color: mutedColor, opacity: 0.6, margin: '0 0 4px 0', fontFamily: 'monospace' }}>
                  Stripe Payment Reference: {data.financials.stripePaymentIntentId}
                </Text>
              )}
              <Text style={{ fontSize: '10px', color: mutedColor, opacity: 0.6, margin: 0 }}>
                Processed on: {new Date(data.financials.paidAt || Date.now()).toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT
              </Text>
            </div>
          </Section>

          {/* ACTION BUTTON & PRE-BOARDING CHECKLIST */}
          <Section style={{
            backgroundColor: surfaceColor,
            border: `1px solid ${primaryColor}`,
            borderRadius: '10px',
            padding: '28px',
            textAlign: 'center',
            margin: '0 0 24px 0',
          }}>
            <Text style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: primaryColor,
              margin: '0 0 6px 0',
              textTransform: 'uppercase',
            }}>
              Required Next Step
            </Text>
            <Heading style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#FFFFFF',
              margin: '0 0 10px 0',
              fontFamily: 'Georgia, serif',
            }}>
              Digital Passenger Liability Waiver
            </Heading>
            <Text style={{
              fontSize: '13px',
              color: mutedColor,
              margin: '0 0 20px 0',
              lineHeight: '1.5',
            }}>
              US Coast Guard regulations require all charter passengers to execute the digital bareboat release waiver prior to departure. You can also add guest names and email them their unique signing links from your portal.
            </Text>

            <Link href={data.portalUrl} target="_blank" style={{
              display: 'inline-block',
              backgroundColor: primaryColor,
              color: '#F4F1EA',
              padding: '14px 32px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textDecoration: 'none',
              textTransform: 'uppercase',
            }}>
              Access Guest Portal & Sign Waivers →
            </Link>
          </Section>

          {/* Footer */}
          <Section style={{
            textAlign: 'center',
            padding: '16px 0 32px 0',
          }}>
            <Text style={{
              fontSize: '11px',
              color: mutedColor,
              opacity: 0.7,
              margin: '0 0 6px 0',
            }}>
              M/Y Whiskey Private Charters • Destin Harbor & Baytowne Marina, FL
            </Text>
            <Text style={{
              fontSize: '11px',
              color: mutedColor,
              opacity: 0.7,
              margin: '0 0 6px 0',
            }}>
              Direct Concierge: <Link href="tel:8503603590" style={{ color: primaryColor, textDecoration: 'none' }}>(850) 360-3590</Link> • <Link href="mailto:concierge@motoryachtwhiskey.com" style={{ color: primaryColor, textDecoration: 'underline' }}>concierge@motoryachtwhiskey.com</Link>
            </Text>
            <Text style={{
              fontSize: '9px',
              color: mutedColor,
              opacity: 0.45,
              margin: '12px 0 0 0',
              lineHeight: '1.4',
            }}>
              This is an official transactional receipt and confirmation for your private yacht charter. Please save this communication for your records.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

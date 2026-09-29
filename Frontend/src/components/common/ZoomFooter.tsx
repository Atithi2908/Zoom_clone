'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Globe } from 'lucide-react';

export default function ZoomFooter() {
  return (
    <footer
      style={{
        backgroundColor: '#232333',
        color: '#CBD5E1',
        padding: '56px 40px 32px',
        fontSize: '13px',
        borderTop: '1px solid #2F3142',
        marginTop: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '36px',
          marginBottom: '48px',
        }}
        className="zoom-footer-grid"
      >
        {/* Column 1: About */}
        <div>
          <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
            About
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Blog</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Customers</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Our Team</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Careers</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Integrations</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Partners</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Investors</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Press</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Sustainability &amp; ESG</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Cares</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Media Kit</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>How to Videos</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Developer Platform</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Ventures</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Merchandise Store</span></li>
          </ul>
        </div>

        {/* Column 2: Download */}
        <div>
          <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
            Download
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Workplace App</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Rooms Client</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Browser Extension</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Outlook Plug-in</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Plugin for HCL Notes</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Plugin Admin Tool for HCL Notes</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Android App</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Virtual Backgrounds</span></li>
          </ul>
        </div>

        {/* Column 3: Sales */}
        <div>
          <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
            Sales
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>0008000503335</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Contact Sales</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Plans &amp; Pricing</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Request a Demo</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Webinars and Events</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Experience Center</span></li>
          </ul>
        </div>

        {/* Column 4: Support */}
        <div>
          <h4 style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>
            Support
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Test Zoom</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Account</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Support Center</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Learning Center</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Zoom Community</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Feedback</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Contact Us</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Accessibility</span></li>
            <li><span style={{ color: '#94A3B8', cursor: 'pointer' }}>Developer support</span></li>
            <li>
              <span style={{ color: '#94A3B8', cursor: 'pointer', lineHeight: 1.4 }}>
                Privacy, Security, Legal Policies, and Modern Slavery Act Transparency Statement
              </span>
            </li>
          </ul>
        </div>

        {/* Column 5: Language, Currency, Social */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Language
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 12px',
                color: '#E2E8F0',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span>English</span>
              <ChevronDown size={14} color="#94A3B8" />
            </div>
          </div>

          <div>
            <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>
              Currency
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '7px 12px',
                color: '#E2E8F0',
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <span>Indian Rupee &#8377;</span>
              <ChevronDown size={14} color="#94A3B8" />
            </div>
          </div>

          {/* Social Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
            {/* WordPress */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="Blog">
              W
            </div>
            {/* LinkedIn */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="LinkedIn">
              in
            </div>
            {/* X */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="X (Twitter)">
              &#120143;
            </div>
            {/* YouTube */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="YouTube">
              &#9654;
            </div>
            {/* Facebook */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="Facebook">
              f
            </div>
            {/* Instagram */}
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }} title="Instagram">
              &#9678;
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Copyright and Legal links */}
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#94A3B8',
          lineHeight: 1.6,
        }}
      >
        <span>Copyright &copy;2026 Zoom Communications, Inc. All rights reserved.</span>
        <span style={{ cursor: 'pointer' }}>Terms</span>
        <span>|</span>
        <span style={{ cursor: 'pointer', color: '#CBD5E1' }}>Privacy</span>
        <span>|</span>
        <span style={{ cursor: 'pointer' }}>Trust Center</span>
        <span>|</span>
        <span style={{ cursor: 'pointer' }}>Acceptable Use Guidelines</span>
        <span>|</span>
        <span style={{ cursor: 'pointer' }}>Legal &amp; Compliance</span>
        <span>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ backgroundColor: '#0E71EB', color: '#FFFFFF', borderRadius: '3px', fontSize: '9px', padding: '0 4px', fontWeight: 700 }}>&#10003;&#10005;</span>
          <span>Your Privacy Choices</span>
        </span>
        <span>|</span>
        <span style={{ cursor: 'pointer' }}>Cookie Preferences</span>
      </div>
    </footer>
  );
}

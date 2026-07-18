import './globals.css';
import type { Metadata } from 'next';
import Chatbot from '../components/Chatbot';
import PageLoader from '../components/PageLoader';
import FeedbackWidget from '../components/FeedbackWidget';

export const metadata: Metadata = {
  title: 'SENTINEL ADS SISAKET',
  description: 'ระบบควบคุมการตรวจจับ วิเคราะห์ และจัดการโฆษณาผลิตภัณฑ์สุขภาพผิดกฎหมายสำหรับหน่วยงานสาธารณสุข',
  keywords: 'Sentinel ADS, illegal ads, public health, law enforcement, dashboard',
  icons: {
    icon: '/sentinel-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <PageLoader />
        {children}
        <Chatbot />
        <FeedbackWidget />
      </body>
    </html>
  );
}

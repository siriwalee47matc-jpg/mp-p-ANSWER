import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ระบบเฝ้าระวังและอนุมัติคดีโฆษณาผลิตภัณฑ์สุขภาพผิดกฎหมาย | SENTINEL ADs ssk',
  description: 'ระบบสนับสนุนเจ้าหน้าที่รัฐนิติกรและผู้บริหารร่วมกับเบาะแสผู้บริโภคในการเฝ้าระวัง ตรวจวิเคราะห์ และสั่งปิดกั้นโดเมนโฆษณาอันตรายเกินจริง',
  keywords: 'อย., โฆษณาเกินจริง, คดีผลิตภัณฑ์สุขภาพ, Ad Shield, แจ้งเบาะแสโฆษณา',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

import { Courier_Prime } from 'next/font/google';
import './globals.css';

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'SHAREPRICE // Cosmetic Calculator',
  description: 'Calculators and historical records for sharing cosmetic prices',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Price2Share',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={courierPrime.variable}>
      <body className="bg-[#f0f0f0] min-h-screen">
        {children}
      </body>
    </html>
  );
}

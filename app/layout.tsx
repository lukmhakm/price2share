import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
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
    <html lang="id" className={jetbrainsMono.variable}>
      <body className="bg-[#f0f0f0] min-h-screen">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { Outfit, Bricolage_Grotesque } from 'next/font/google';
import { RxDBProvider } from '@/components/providers/RxDBProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SerwistProvider } from './serwist';
import './globals.css';

const outfit = Outfit({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const bricolage = Bricolage_Grotesque({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const APP_NAME = 'BuddyBills';
const APP_DEFAULT_TITLE = 'BuddyBills — Split Expenses Effortlessly';
const APP_TITLE_TEMPLATE = '%s - BuddyBills';
const APP_DESCRIPTION =
  'A robust, offline-first group expense splitting application. Track shared costs, settle debts, and never argue about money again.';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0C0C0F',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <body className={`${outfit.variable} ${bricolage.variable} antialiased`}>
        <SerwistProvider swUrl='/serwist/sw.js'>
          <AuthProvider>
            <RxDBProvider>{children}</RxDBProvider>
          </AuthProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}

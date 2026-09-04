import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Noto_Serif_SC, JetBrains_Mono } from 'next/font/google';
import { Inspector } from 'react-dev-inspector';
import { SupabaseConfigProvider } from '@/lib/supabase-config-inject';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-sc',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: '密码管家',
    template: '%s | 密码管家',
  },
  description: '一个安静、值得托付的个人账号密码保管处。',
  icons: {
    icon: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: '密码管家',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f1e8' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1814' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html
      lang="zh-CN"
      className={`dark ${cormorant.variable} ${notoSerifSC.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased min-h-screen bg-background text-foreground overflow-x-hidden">
        <SupabaseConfigProvider>
          {isDev && <Inspector />}
          {children}
          <Toaster />
        </SupabaseConfigProvider>
      </body>
    </html>
  );
}

import '@/app/global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import { IBM_Plex_Sans } from 'next/font/google';
import Script from 'next/script';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={ibmPlexSans.className}
      suppressHydrationWarning
      style={{ colorScheme: 'dark' }}
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider
          theme={{ defaultTheme: 'dark' }}
          search={{
            options: {
              api: '/docs/api/search',
            },
          }}
        >
          {children}
        </RootProvider>
        <Script
          src="https://plausible.io/js/script.js"
          data-domain="polotno.com"
          strategy="afterInteractive"
        />
        <Script
          src="https://crawlchat.app/embed.js"
          id="crawlchat-script"
          data-id="67e312247a822a2303f2b8a7"
          data-ask-ai="true"
          data-ask-ai-background-color="rgba(79, 104, 232, 1)"
          data-ask-ai-color="#ffffff"
          data-ask-ai-text="💬 Ask AI"
          data-ask-ai-position="br"
          data-ask-ai-radius="20px"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

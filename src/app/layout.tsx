import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "@/components/clientlayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UB Industri",
  description: "UB Industri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Script id="chunk-load-fallback" strategy="beforeInteractive">
          {`
            (function() {
              function shouldReload(msg) {
                if (!msg) return false;
                var s = String(msg);
                return /ChunkLoadError|Loading chunk|failed to load chunk|dynamically imported module|importing a module script failed/i.test(s);
              }
              function reloadOnce() {
                try {
                  if (sessionStorage.getItem('__chunk_reload__') === '1') return;
                  sessionStorage.setItem('__chunk_reload__', '1');
                } catch (e) {}
                try { window.location.reload(); } catch (e) {}
              }
              window.addEventListener('error', function(e) {
                var msg = (e && (e.message || (e.error && e.error.message))) || '';
                if (shouldReload(msg)) reloadOnce();
              });
              window.addEventListener('unhandledrejection', function(e) {
                var r = e && e.reason;
                var msg = (r && (r.message || r)) || '';
                if (shouldReload(msg)) reloadOnce();
              });
            })();
          `}
        </Script>
        <Script id="cz-hydration-fix" strategy="beforeInteractive">
          {`
            (function() {
              function removeAttr() {
                if (document && document.body && document.body.hasAttribute && document.body.hasAttribute('cz-shortcut-listen')) {
                  document.body.removeAttribute('cz-shortcut-listen');
                }
              }
              removeAttr();
              try {
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes' && m.attributeName === 'cz-shortcut-listen') {
                      removeAttr();
                    }
                  }
                });
                if (document && document.body) {
                  observer.observe(document.body, { attributes: true, attributeFilter: ['cz-shortcut-listen'] });
                }
              } catch (e) {}
            })();
          `}
        </Script>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

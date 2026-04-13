import type { Metadata } from "next";
import { Inter, Fredoka } from "next/font/google";
import Script from "next/script";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Providers from "./components/Providers";
import DiscountBanner from "./components/DiscountBanner";
import GlobalToast from "./components/GlobalToast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-fredoka",
});

export const metadata: Metadata = {
  title: "A Marte - Pijamas Espaciales para Niños",
  description:
    "Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.",
  keywords: ["pijamas", "niños", "espacial", "marte", "infantil", "ropa niños"],
  authors: [{ name: "A Marte" }],
  metadataBase: new URL("https://www.amartekids.com"),
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
  openGraph: {
    title: "A Marte - Pijamas Espaciales para Niños",
    description:
      "Pijamas que llevan a los pequeños a Marte. Colección de pijamas espaciales infantiles.",
    url: "https://www.amartekids.com",
    siteName: "A Marte Kids",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "A Marte Kids - Pijamas Espaciales",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "A Marte - Pijamas Espaciales para Niños",
    description: "Pijamas que llevan a los pequeños a Marte",
    images: ["/og-image.png"],
  },
};

const RemoveBrowserExtensionsScript = () => {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            if (document.body && document.body.hasAttribute('cz-shortcut-listen')) {
              document.body.removeAttribute('cz-shortcut-listen');
            }

            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', function() {
                if (document.body && document.body.hasAttribute('cz-shortcut-listen')) {
                  document.body.removeAttribute('cz-shortcut-listen');
                }
              });
            }
          })();
        `,
      }}
    />
  );
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${fredoka.variable}`}
    >
      <head>
        <meta
          name="facebook-domain-verification"
          content="e035l4licwdfamfgbistjahaoepmol"
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "A Marte Kids",
              description:
                "Pijamas espaciales para niños que inspiran la imaginación y el sueño",
              url: "https://www.amartekids.com",
              logo: "https://www.amartekids.com/logo.png",
              sameAs: [
                "https://www.instagram.com/amartekids",
                "https://www.facebook.com/amartekids",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: "hola@amartekids.com",
                contactType: "Customer Service",
              },
            }),
          }}
        />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <RemoveBrowserExtensionsScript />
      </head>

      <body
        suppressHydrationWarning
        className="min-h-screen bg-white text-gray-900 font-sans antialiased"
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PSC5SCVB"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>

        {metaPixelId && (
          <>
            <Script id="meta-pixel-base" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `}
            </Script>

            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              />
            </noscript>
          </>
        )}

        <Providers>
          <GlobalToast />
          <Header />
          <DiscountBanner />
          <main className="flex-grow pt-16">{children}</main>
          <Footer />
        </Providers>

        <GoogleTagManager gtmId="GTM-PSC5SCVB" />
      </body>
    </html>
  );
}
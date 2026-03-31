import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-english",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-english-mono",
})

const paperlogy = localFont({
  src: [
    { path: "../lib/assets/fonts/Paperlogy-4Regular.ttf", weight: "400", style: "normal" },
    { path: "../lib/assets/fonts/Paperlogy-5Medium.ttf", weight: "500", style: "normal" },
    { path: "../lib/assets/fonts/Paperlogy-6SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../lib/assets/fonts/Paperlogy-7Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-korean",
  display: "swap",
})

export const metadata: Metadata = {
  title: 'Glider',
  description: 'Glider AI 워크스페이스',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geist.variable} ${geistMono.variable} ${paperlogy.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

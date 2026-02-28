import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Pyaw Kyi - Just Say',
  description: 'Voice-to-AI assistant that transforms your spoken words into polished text, structured mindmaps, viral content, and functional apps. Built by Phyo Zin Ko.',
  keywords: ['voice to text', 'AI assistant', 'speech recognition', 'mindmap generator', 'content creator', 'app builder'],
  authors: [{ name: 'Phyo Zin Ko', url: 'https://phyodynamic.com' }],
  creator: 'Phyo Zin Ko',
  icons: {
    icon: '/pyaw_kyi_favi.png',
    shortcut: '/pyaw_kyi_favi.png',
    apple: '/pyaw_kyi_favi.png',
  },
  openGraph: {
    title: 'Pyaw Kyi - Just Say',
    description: 'Voice-to-AI assistant that transforms your spoken words into polished text, structured mindmaps, viral content, and functional apps.',
    type: 'website',
    images: [
      {
        url: '/pyaw_kyi.png',
        width: 512,
        height: 512,
        alt: 'Pyaw Kyi Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Pyaw Kyi - Just Say',
    description: 'Voice-to-AI assistant that transforms your spoken words into polished text, structured mindmaps, viral content, and functional apps.',
    images: ['/pyaw_kyi.png'],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

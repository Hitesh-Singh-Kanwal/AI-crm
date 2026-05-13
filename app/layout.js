import './globals.css'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dance Academy CRM',
  description: 'Multi-branch CRM system for dance academy management',
}



export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}



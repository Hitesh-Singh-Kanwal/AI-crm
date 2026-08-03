import './globals.css'
import { Inter, Fraunces } from 'next/font/google'
import Script from 'next/script'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })
// Display face for the CADANCE AI wordmark — exposed as --font-display.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
})

export const metadata = {
  title: 'CADANCE AI — Studio Intelligence',
  description: 'Multi-branch CRM system for dance academy management',
}



export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${fraunces.variable}`}>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}



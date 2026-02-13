import './globals.css'
import { Inter } from 'next/font/google'
import FloatingChatbot from '@/components/FloatingChatbot'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Dance Academy CRM',
  description: 'Multi-branch CRM system for dance academy management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <FloatingChatbot />
        </Providers>
      </body>
    </html>
  )
}



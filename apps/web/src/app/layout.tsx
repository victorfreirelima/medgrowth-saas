import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: 'MedGrowth | Medical Marketing Agency',
    description: 'Dashboard de performance para clínicas e médicos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className={inter.variable}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

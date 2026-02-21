import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

if (process.env.VERCEL) {
    process.env.NEXTAUTH_URL = 'https://medgrowth-saas.vercel.app';
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

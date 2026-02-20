import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    const { data } = await axios.post(`${API_URL}/auth/login`, {
                        email: credentials.email,
                        password: credentials.password,
                    });
                    if (data.accessToken) {
                        return {
                            id: data.userId,
                            email: data.email,
                            role: data.role,
                            clientIds: data.clientIds,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                        };
                    }
                    return null;
                } catch {
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.clientIds = (user as any).clientIds;
                token.accessToken = (user as any).accessToken;
                token.refreshToken = (user as any).refreshToken;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id as string;
            (session.user as any).role = token.role;
            (session.user as any).clientIds = token.clientIds;
            (session.user as any).accessToken = token.accessToken;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
    secret: process.env.NEXTAUTH_SECRET,
};

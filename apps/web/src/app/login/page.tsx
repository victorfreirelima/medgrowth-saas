'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { FormInput } from '@/components/ui/FormInput';

const schema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        try {
            schema.parse({ email, password });
        } catch (err) {
            setError('Credenciais inválidas ou erro no servidor');
            return;
        }
        setLoading(true);
        const result = await signIn('credentials', { email, password, redirect: false });
        setLoading(false);
        if (result?.ok) {
            router.push('/dashboard');
        } else {
            setError('Email ou senha incorretos');
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59,130,246,0.4) 0%, transparent 50%),
                          radial-gradient(circle at 75% 75%, rgba(99,102,241,0.4) 0%, transparent 50%)`
            }} />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/30 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">MedGrowth</h1>
                    <p className="text-blue-300 mt-1 text-sm">Plataforma de Marketing Médico</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Entrar na plataforma</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput
                            label="Email"
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            autoComplete="email"
                            required
                        />

                        <FormInput
                            label="Senha"
                            id="password"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            id="login-btn"
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Entrando...
                                </span>
                            ) : 'Entrar'}
                        </button>
                    </form>

                    <div className="mt-6 pt-4 border-t border-white/10">
                        <p className="text-blue-300/70 text-xs text-center">
                            Acesso restrito a usuários autorizados
                        </p>
                        <div className="mt-3 text-xs text-blue-300/50 text-center space-y-0.5">
                            <p>Admin: admin@medgrowth.com / Admin123!</p>
                            <p>Comercial: comercial@medgrowth.com / Comercial123!</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';

interface Client {
    id: string;
    name: string;
    slug?: string;
}

interface ClientContextType {
    selectedClientId: string | null;
    setSelectedClientId: (id: string | null) => void;
    availableClients: Client[];
    isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export function ClientProvider({ children }: { children: React.ReactNode }) {
    const { data: session } = useSession();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [availableClients, setAvailableClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!session?.user) {
            setIsLoading(false);
            return;
        }

        const fetchClients = async () => {
            try {
                const res = await api.get('/clients');
                const clients = res.data;
                setAvailableClients(clients);

                // Load from localStorage if present
                const storedId = localStorage.getItem('medgrowth.selectedClientId');
                const role = (session.user as any).role;

                if (storedId && (storedId === 'ALL' ? role === 'ADMIN' : clients.some((c: Client) => c.id === storedId))) {
                    setSelectedClientId(storedId);
                } else if (clients.length > 0) {
                    setSelectedClientId(clients[0].id);
                } else if (role === 'ADMIN') {
                    setSelectedClientId('ALL');
                }
            } catch (error) {
                console.error('Failed to fetch clients for context', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClients();
    }, [session]);

    const handleSelectClient = (id: string | null) => {
        setSelectedClientId(id);
        if (id) {
            localStorage.setItem('medgrowth.selectedClientId', id);
        } else {
            localStorage.removeItem('medgrowth.selectedClientId');
        }
    };

    return (
        <ClientContext.Provider
            value={{
                selectedClientId,
                setSelectedClientId: handleSelectClient,
                availableClients,
                isLoading,
            }}
        >
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (context === undefined) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}

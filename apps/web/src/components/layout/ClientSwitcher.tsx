'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Building2 } from 'lucide-react';
import { useClient } from '@/contexts/ClientContext';

export function ClientSwitcher() {
    const { data: session } = useSession();
    const { selectedClientId, setSelectedClientId, availableClients, isLoading } = useClient();

    if (isLoading) {
        return <div className="h-9 w-[240px] animate-pulse bg-gray-100 rounded-md" />;
    }

    const role = (session?.user as any)?.role;
    const canSeeAll = role === 'ADMIN';

    const items = canSeeAll
        ? [{ id: 'ALL', name: 'Todos os Clientes' }, ...availableClients]
        : availableClients;

    return (
        <div className="relative flex items-center">
            <div className="absolute left-3 text-gray-500 pointer-events-none">
                <Building2 className="h-4 w-4" />
            </div>
            <select
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm rounded-md block w-[240px] pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer"
            >
                <option value="" disabled>Selecione um cliente...</option>
                {items.map((client) => (
                    <option key={client.id} value={client.id}>
                        {client.name}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    );
}

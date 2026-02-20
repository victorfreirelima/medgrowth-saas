"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting seed...');
    // ─── Clean up ───────────────────────────────────────────────────────────────
    await prisma.auditLog.deleteMany();
    await prisma.campaignSnapshotDaily.deleteMany();
    await prisma.adAccountConnection.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.leadNote.deleteMany();
    await prisma.lead.deleteMany();
    await prisma.userClient.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    // ─── Clients ────────────────────────────────────────────────────────────────
    const clinicaVida = await prisma.client.create({
        data: {
            name: 'Clínica Vida Plena',
            slug: 'clinica-vida-plena',
            logoUrl: null,
        },
    });
    const drCarvalho = await prisma.client.create({
        data: {
            name: 'Dr. Carvalho Dermatologia',
            slug: 'dr-carvalho-dermatologia',
            logoUrl: null,
        },
    });
    const clinicaEstetica = await prisma.client.create({
        data: {
            name: 'Clínica Estética Premium',
            slug: 'clinica-estetica-premium',
            logoUrl: null,
        },
    });
    console.log('✅ Clients created');
    // ─── Users ──────────────────────────────────────────────────────────────────
    const adminPassword = await bcrypt.hash('Admin123!', 10);
    const commercialPassword = await bcrypt.hash('Comercial123!', 10);
    const managerPassword = await bcrypt.hash('Gestor123!', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@medgrowth.com',
            name: 'Admin MedGrowth',
            passwordHash: adminPassword,
            role: client_1.UserRole.ADMIN,
        },
    });
    const commercial1 = await prisma.user.create({
        data: {
            email: 'comercial@medgrowth.com',
            name: 'Ana Comercial',
            passwordHash: commercialPassword,
            role: client_1.UserRole.COMMERCIAL,
        },
    });
    const commercial2 = await prisma.user.create({
        data: {
            email: 'comercial2@medgrowth.com',
            name: 'Pedro Santos',
            passwordHash: commercialPassword,
            role: client_1.UserRole.COMMERCIAL,
        },
    });
    const manager1 = await prisma.user.create({
        data: {
            email: 'gestor@medgrowth.com',
            name: 'Dr. Carvalho',
            passwordHash: managerPassword,
            role: client_1.UserRole.MANAGER,
        },
    });
    const manager2 = await prisma.user.create({
        data: {
            email: 'gestor2@medgrowth.com',
            name: 'Dra. Lima',
            passwordHash: managerPassword,
            role: client_1.UserRole.MANAGER,
        },
    });
    // Link users to clients
    await prisma.userClient.createMany({
        data: [
            { userId: admin.id, clientId: clinicaVida.id },
            { userId: admin.id, clientId: drCarvalho.id },
            { userId: admin.id, clientId: clinicaEstetica.id },
            { userId: commercial1.id, clientId: clinicaVida.id },
            { userId: commercial1.id, clientId: drCarvalho.id },
            { userId: commercial2.id, clientId: clinicaEstetica.id },
            { userId: manager1.id, clientId: drCarvalho.id },
            { userId: manager2.id, clientId: clinicaVida.id },
        ],
    });
    console.log('✅ Users created and linked to clients');
    // ─── Ad Account Connections ──────────────────────────────────────────────────
    const metaConnection = await prisma.adAccountConnection.create({
        data: {
            clientId: clinicaVida.id,
            channel: client_1.AdChannel.META,
            accountId: 'act_123456789',
            accountName: 'Clínica Vida Plena - Meta',
            accessTokenEncrypted: 'demo_encrypted_token_meta',
            status: client_1.ConnectionStatus.ACTIVE,
            lastSyncAt: new Date(),
        },
    });
    const googleConnection = await prisma.adAccountConnection.create({
        data: {
            clientId: clinicaVida.id,
            channel: client_1.AdChannel.GOOGLE,
            accountId: '987654321',
            accountName: 'Clínica Vida Plena - Google',
            accessTokenEncrypted: 'demo_encrypted_token_google',
            status: client_1.ConnectionStatus.ACTIVE,
            lastSyncAt: new Date(),
        },
    });
    const metaConnectionCarvalho = await prisma.adAccountConnection.create({
        data: {
            clientId: drCarvalho.id,
            channel: client_1.AdChannel.META,
            accountId: 'act_987654321',
            accountName: 'Dr. Carvalho - Meta',
            accessTokenEncrypted: 'demo_encrypted_token_meta_2',
            status: client_1.ConnectionStatus.ACTIVE,
            lastSyncAt: new Date(),
        },
    });
    console.log('✅ Ad connections created');
    // ─── Campaign Snapshots (60 days) ───────────────────────────────────────────
    const campaigns = [
        { id: 'camp_001', name: 'Consulta Clínica Geral', channel: client_1.AdChannel.META, connectionId: metaConnection.id },
        { id: 'camp_002', name: 'Procedimentos Estéticos', channel: client_1.AdChannel.META, connectionId: metaConnection.id },
        { id: 'camp_003', name: 'Clínica - Busca Google', channel: client_1.AdChannel.GOOGLE, connectionId: googleConnection.id },
        { id: 'camp_004', name: 'Retargeting Meta', channel: client_1.AdChannel.META, connectionId: metaConnection.id },
        { id: 'camp_005', name: 'Display Google', channel: client_1.AdChannel.GOOGLE, connectionId: googleConnection.id },
        { id: 'camp_006', name: 'Dermatologia - Meta', channel: client_1.AdChannel.META, connectionId: metaConnectionCarvalho.id },
        { id: 'camp_007', name: 'Peeling Químico', channel: client_1.AdChannel.META, connectionId: metaConnectionCarvalho.id },
    ];
    const snapshots = [];
    for (let d = 59; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        date.setHours(0, 0, 0, 0);
        for (const camp of campaigns) {
            const spend = parseFloat((Math.random() * 200 + 50).toFixed(2));
            const impressions = Math.floor(Math.random() * 20000 + 5000);
            const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01));
            const leads = Math.floor(clicks * (Math.random() * 0.1 + 0.02));
            const conversions = Math.floor(leads * (Math.random() * 0.3 + 0.1));
            const ctr = clicks / impressions;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const cpm = (spend / impressions) * 1000;
            snapshots.push({
                connectionId: camp.connectionId,
                date,
                campaignId: camp.id,
                campaignName: camp.name,
                channel: camp.channel,
                spend,
                impressions,
                clicks,
                ctr,
                cpc,
                cpm,
                leads,
                conversions,
                reach: Math.floor(impressions * 0.7),
                frequency: parseFloat((impressions / (impressions * 0.7)).toFixed(2)),
            });
        }
    }
    await prisma.campaignSnapshotDaily.createMany({ data: snapshots });
    console.log(`✅ ${snapshots.length} campaign snapshots created`);
    // ─── Leads ─────────────────────────────────────────────────────────────────
    const firstNames = ['Maria', 'Ana', 'João', 'Carlos', 'Fernanda', 'Pedro', 'Juliana', 'Rafael', 'Patricia', 'Lucas', 'Camila', 'Marcos'];
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Rodrigues', 'Lima', 'Gomes'];
    const procedures = ['Consulta Inicial', 'Peeling Químico', 'Botox', 'Preenchimento', 'Limpeza de Pele', 'Tratamento de Acne', 'Harmonização Facial'];
    const channels = [client_1.LeadChannel.META, client_1.LeadChannel.GOOGLE, client_1.LeadChannel.ORGANIC, client_1.LeadChannel.REFERRAL];
    const statuses = [client_1.LeadStatus.NEW, client_1.LeadStatus.CONTACTED, client_1.LeadStatus.QUALIFIED, client_1.LeadStatus.SCHEDULED, client_1.LeadStatus.ATTENDED, client_1.LeadStatus.WON, client_1.LeadStatus.LOST];
    const campaignNames = ['Consulta Clínica Geral', 'Procedimentos Estéticos', 'Clínica - Busca Google', 'Retargeting Meta', 'Dermatologia - Meta'];
    const allLeads = [];
    const clients = [clinicaVida, drCarvalho, clinicaEstetica];
    const commercials = [commercial1.id, commercial2.id];
    for (const client of clients) {
        for (let i = 0; i < 35; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const channel = channels[Math.floor(Math.random() * channels.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const campaignName = campaignNames[Math.floor(Math.random() * campaignNames.length)];
            const daysAgo = Math.floor(Math.random() * 60);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);
            const lead = await prisma.lead.create({
                data: {
                    clientId: client.id,
                    name: `${firstName} ${lastName}`,
                    phone: `(11) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
                    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@email.com`,
                    origin: channel === client_1.LeadChannel.META ? 'Facebook/Instagram' : channel === client_1.LeadChannel.GOOGLE ? 'Google' : 'Orgânico',
                    channel,
                    campaignName,
                    status,
                    assignedToId: commercials[Math.floor(Math.random() * commercials.length)],
                    utmSource: channel === client_1.LeadChannel.META ? 'facebook' : channel === client_1.LeadChannel.GOOGLE ? 'google' : null,
                    utmMedium: channel === client_1.LeadChannel.META ? 'paid_social' : channel === client_1.LeadChannel.GOOGLE ? 'cpc' : null,
                    utmCampaign: campaignName.toLowerCase().replace(/ /g, '-'),
                    createdAt,
                },
            });
            allLeads.push({ lead, procedure: procedures[Math.floor(Math.random() * procedures.length)], status });
        }
    }
    console.log(`✅ ${allLeads.length} leads created`);
    // ─── Lead Notes ─────────────────────────────────────────────────────────────
    const notesData = [];
    for (const { lead } of allLeads.slice(0, 30)) {
        if (Math.random() > 0.5) {
            notesData.push({
                leadId: lead.id,
                userId: commercial1.id,
                content: 'Paciente demonstrou interesse no procedimento. Aguardando confirmação de horário.',
            });
        }
    }
    await prisma.leadNote.createMany({ data: notesData });
    // ─── Appointments ───────────────────────────────────────────────────────────
    const scheduledLeads = allLeads.filter(({ status }) => [client_1.LeadStatus.SCHEDULED, client_1.LeadStatus.ATTENDED, client_1.LeadStatus.WON].includes(status));
    for (const { lead, procedure } of scheduledLeads.slice(0, 40)) {
        const daysFromNow = Math.floor(Math.random() * 30) - 15;
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + daysFromNow);
        appointmentDate.setHours(9 + Math.floor(Math.random() * 8), Math.random() > 0.5 ? 0 : 30, 0, 0);
        const apptStatus = daysFromNow < 0
            ? (Math.random() > 0.2 ? client_1.AppointmentStatus.COMPLETED : client_1.AppointmentStatus.NO_SHOW)
            : client_1.AppointmentStatus.CONFIRMED;
        await prisma.appointment.create({
            data: {
                leadId: lead.id,
                dateTime: appointmentDate,
                procedure,
                status: apptStatus,
                notes: Math.random() > 0.5 ? 'Paciente confirmou por WhatsApp.' : null,
            },
        });
    }
    console.log('✅ Appointments created');
    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Login credentials:');
    console.log('  Admin:      admin@medgrowth.com     / Admin123!');
    console.log('  Commercial: comercial@medgrowth.com / Comercial123!');
    console.log('  Manager:    gestor@medgrowth.com    / Gestor123!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:QZkWuibKMWaxePXVqDztWLTmzgUaziWZ@turntable.proxy.rlwy.net:31011/railway"
        }
    }
});

async function main() {
    console.log('Starting data backfill for clientId...');

    // 1. Backfill Appointments
    const appointmentsList = await prisma.appointment.findMany({
        where: { clientId: null },
        include: { lead: true }
    });

    let appointmentsUpdated = 0;
    for (const appt of appointmentsList) {
        if (appt.lead && appt.lead.clientId) {
            await prisma.appointment.update({
                where: { id: appt.id },
                data: { clientId: appt.lead.clientId }
            });
            appointmentsUpdated++;
        }
    }
    console.log(`Updated ${appointmentsUpdated} appointments with clientId.`);

    // 2. Backfill CampaignSnapshotDaily
    const snapshots = await prisma.campaignSnapshotDaily.findMany({
        where: { clientId: null },
        include: { connection: true }
    });

    let snapshotsUpdated = 0;
    for (const snap of snapshots) {
        if (snap.connection && snap.connection.clientId) {
            await prisma.campaignSnapshotDaily.update({
                where: { id: snap.id },
                data: { clientId: snap.connection.clientId }
            });
            snapshotsUpdated++;
        }
    }
    console.log(`Updated ${snapshotsUpdated} snapshots with clientId.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

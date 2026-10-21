'use client';

import { DEMO_MODE } from '@/config/environment';
import { BillingScreen } from '@/components/billing/billing-workspace';
import { AdminDashboard } from '@/components/admin-dashboard';
import { RoleGate } from '@/lib/platform/auth';
import '@/components/auth/platform.css';

export default function AdminPage() {
  if (!DEMO_MODE) return <BillingScreen section="overview" />;
  return (
    <RoleGate allowed={['admin']}>
      <AdminDashboard />
    </RoleGate>
  );
}

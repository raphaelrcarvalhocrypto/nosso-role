import DashboardPage from "@/features/dashboard/DashboardPage";
import SecureAuthWrapper from "@/components/auth/SecureAuthWrapper";

export default function Page() {
  return (
    <SecureAuthWrapper requireVerifiedSession={true}>
      <DashboardPage />
    </SecureAuthWrapper>
  );
}

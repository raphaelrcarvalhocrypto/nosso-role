import TripsPage from "@/features/trips/TripsPage";

type TripDetailsPageProps = {
  params: Promise<{
    tripId: string;
  }>;
};

export default async function Page({ params }: TripDetailsPageProps) {
  const { tripId } = await params;
  return <TripsPage focusTripId={tripId} />;
}

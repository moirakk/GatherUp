import { notFound } from "next/navigation";

import { RegistrationFlow } from "@/components/registration-flow";
import { getPublicEventDetail } from "@/lib/events-data";

type RegisterPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { eventId } = await params;
  const { step } = await searchParams;
  const eventDetail = await getPublicEventDetail(eventId);

  if (!eventDetail) {
    notFound();
  }

  return <RegistrationFlow event={eventDetail.event} initialStep={step} setup={eventDetail.setup} />;
}

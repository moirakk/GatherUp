import { notFound } from "next/navigation";

import { RegistrationFlow } from "@/components/registration-flow";
import { findEvent, getEventSetup } from "@/lib/mock-data";

type RegisterPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { eventId } = await params;
  const { step } = await searchParams;
  const event = findEvent(eventId);

  if (!event) {
    notFound();
  }

  const setup = getEventSetup(eventId);

  return <RegistrationFlow event={event} initialStep={step} setup={setup} />;
}

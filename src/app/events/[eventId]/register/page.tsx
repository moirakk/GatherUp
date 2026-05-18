import { RegistrationFlow } from "@/components/registration-flow";
import { getEvent } from "@/lib/mock-data";

type RegisterPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);

  return <RegistrationFlow event={event} />;
}

import { RegistrationFlow } from "@/components/registration-flow";
import { getEvent, getEventSetup } from "@/lib/mock-data";

type RegisterPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { eventId } = await params;
  const event = getEvent(eventId);
  const setup = getEventSetup(eventId);

  return <RegistrationFlow event={event} setup={setup} />;
}

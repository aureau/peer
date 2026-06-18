import { AppShell } from "@/components/ui/AppShell";
import { InitiatorView } from "@/components/pairing/InitiatorView";

export default function Home() {
	return (
		<AppShell>
			<InitiatorView />
		</AppShell>
	);
}

import { AppearanceForm } from "~/components/settings/appearance-form";

export function meta() {
  return [{ title: "Appearance settings" }];
}

export default function AppearanceSettings() {
  return <AppearanceForm />;
}

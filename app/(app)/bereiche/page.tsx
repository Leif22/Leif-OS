import { redirect } from "next/navigation";

/** Bereiche werden nur noch unter Einstellungen gepflegt (`/einstellungen#task-bereiche`). */
export default function BereichePage() {
  redirect("/einstellungen#task-bereiche");
}

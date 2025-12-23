import { redirect } from "next/navigation";

export default function Page() {
    // Immediate server-side redirect for fastest navigation
    redirect('/map');
}


import { signOut } from "@/lib/actions/auth";
import { buttonClasses } from "./buttonStyles";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClasses({ variant: "secondary" })}>
        Sign out
      </button>
    </form>
  );
}

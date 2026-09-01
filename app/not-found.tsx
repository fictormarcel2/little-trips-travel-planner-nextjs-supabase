import Link from "next/link";
import { StatusScreen } from "@/components/ui/StatusScreen";
import { buttonClasses } from "@/components/ui/buttonStyles";

export default function NotFound() {
  return (
    <StatusScreen
      title="Nowhere to be found"
      description="This page doesn't exist, or you don't have access to it."
      actions={
        <Link href="/groups" className={buttonClasses({ variant: "primary" })}>
          Back to groups
        </Link>
      }
    />
  );
}

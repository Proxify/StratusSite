import Link from "next/link";
import { auth } from "@/auth";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const session = await auth();

  return (
    <HeaderClient
      user={
        session?.user
          ? {
              name: session.user.name,
              email: session.user.email,
              image: session.user.image,
            }
          : null
      }
    />
  );
}

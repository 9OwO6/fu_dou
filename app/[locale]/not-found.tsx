import Link from "next/link";
import { getMessages } from "@/lib/i18n/get-messages";

export default function StoreNotFound() {
  const messages = getMessages("zh").public.errors;
  return <main className="store-container error-page"><span aria-hidden="true" className="empty-bean">豆</span><h1>{messages.notFoundTitle}</h1><p>{messages.notFoundBody}</p><Link className="button-primary" href="/zh/products">{messages.notFoundCta}</Link></main>;
}

import { getMessages } from "@/lib/i18n/get-messages";

export default function StoreLoading() {
  const messages = getMessages("zh").public.errors;
  return <main className="store-container loading-page" aria-label={messages.loading}><div className="loading-bar" /><div className="loading-grid">{Array.from({ length: 8 }, (_, index) => <div className="loading-card" key={index} />)}</div></main>;
}

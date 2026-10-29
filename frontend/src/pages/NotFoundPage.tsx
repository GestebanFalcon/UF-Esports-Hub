import { Arrow } from "../components/ui/Arrow";

export function NotFoundPage() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 / OUT OF BOUNDS</p>
      <h1>This page isn’t in play.</h1>
      <a className="button primary" href="/">Back to home <Arrow /></a>
    </main>
  );
}

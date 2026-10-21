import { Link } from "react-router-dom";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="grid min-h-[60vh] place-items-center px-4 text-center">
        <div>
          <p className="eyebrow">404</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink-900">Page not found</h1>
          <p className="mt-2 text-sm text-ink-500">The page you're looking for doesn't exist or has moved.</p>
          <Link to="/" className="btn-primary mt-5 inline-flex">Back to home</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}

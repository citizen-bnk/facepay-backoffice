import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">This page does not exist or is not available to your role.</p>
        <Link href="/" className="btn btn-dark mt-6">Back to my portal</Link>
      </div>
    </main>
  );
}

// app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center justify-center">
      {/* Empty as requested. You can add a redirect to /login here later if you want. */}
      <a href="/login" className="text-accent hover:underline">Go to Login</a>
    </main>
  );
}
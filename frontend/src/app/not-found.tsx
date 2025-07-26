import Link from "next/link";

function Page() {
  return (
    <section className="flex flex-col min-h-svh items-center justify-center text-center">
      <div className="four_zero_four_bg">
        <h1 className="text-9xl">404</h1>
      </div>
      <div className="content_box_404 grid gap-2.5">
        <h2 className="text-4xl font-bold">Look like you&apos;re lost.</h2>
        <p className="text-lg font-medium">
          The page you are looking for not available!
        </p>
        <Link
          href="/"
          className="bg-primary text-white p-2 rounded-xl text-md font-semibold"
        >
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}

export default Page;

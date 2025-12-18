export default function ContactPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Contact</h1>
      <p className="text-sm text-muted">
        For support, feedback, or queries: Email:{" "}
        <a
          href="mailto:fuelpriceindiateam@gmail.com"
          className="relative text-muted transition-colors hover:text-text after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:origin-left after:bg-primary after:scale-x-0 after:transition-transform after:content-[''] hover:after:scale-x-100"
        >
          fuelpriceindiateam@gmail.com
        </a>
      </p>
    </div>
  );
}

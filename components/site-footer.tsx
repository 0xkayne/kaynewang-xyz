export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted">
        <p>Kayne · 王子平</p>
        <ul className="flex gap-4">
          <li>
            <a
              href="https://github.com/0xkayne"
              className="underline decoration-line underline-offset-4 hover:text-foreground"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://x.com/0xKayne"
              className="underline decoration-line underline-offset-4 hover:text-foreground"
            >
              X
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

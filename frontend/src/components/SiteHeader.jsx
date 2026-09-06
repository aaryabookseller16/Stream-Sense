const navigation = [
  { href: "/", label: "About" },
  { href: "/product", label: "Product" },
  { href: "/dashboard", label: "Dashboard" },
];

export function PageLink({ children, className, href, onNavigate, currentPath }) {
  const isCurrent =
    currentPath === href || (href === "/" && currentPath === "/about");

  return (
    <a
      aria-current={isCurrent ? "page" : undefined}
      className={className}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {children}
    </a>
  );
}

export function Brand({ onNavigate }) {
  return (
    <a
      className="site-brand"
      href="/"
      aria-label="StreamSense home"
      onClick={(event) => {
        event.preventDefault();
        onNavigate("/");
      }}
    >
      <span className="site-brand__mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>StreamSense</strong>
        <small>Realtime service intelligence</small>
      </span>
    </a>
  );
}

export function SiteHeader({ currentPath, onNavigate }) {
  return (
    <header className="site-header">
      <Brand onNavigate={onNavigate} />
      <nav aria-label="Primary navigation">
        {navigation.map((item) => (
          <PageLink
            className="site-header__link"
            currentPath={currentPath}
            href={item.href}
            key={item.href}
            onNavigate={onNavigate}
          >
            {item.label}
          </PageLink>
        ))}
      </nav>
    </header>
  );
}

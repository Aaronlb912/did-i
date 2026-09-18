export function SiteNav({ path }) {
  return (
    <nav className="di-site-nav">
      <a className="di-site-brand" href="#/">
        Did I
      </a>
      <span className="di-site-links">
        <a href="#/read" className={path === '/read' ? 'is-on' : undefined}>
          Read
        </a>
        <a href="#/name" className={path === '/name' ? 'is-on' : undefined}>
          Name
        </a>
        <a href="#/tonight" className={path === '/tonight' ? 'is-on' : undefined}>
          Tonight
        </a>
      </span>
    </nav>
  )
}

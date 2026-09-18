export function SiteNav({ path }) {
  return (
    <nav className="di-site-nav">
      <a className="di-site-brand" href="#/">
        Did I
      </a>
      <span className="di-site-links">
        <a href="#/door" className={path === '/door' ? 'is-on' : undefined}>
          Door
        </a>
        <a href="#/read" className={path === '/read' ? 'is-on' : undefined}>
          Read
        </a>
        <a href="#/name" className={path === '/name' ? 'is-on' : undefined}>
          Name
        </a>
      </span>
    </nav>
  )
}

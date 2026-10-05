/**
 * A component whose module is required on its first render, not at startup.
 * Metro runs a module the first time it is required, so screens off the first
 * paint cost nothing until opened. Not import(): see native/Boot.jsx.
 */
export function lazyScreen(load, name) {
  let Comp = null
  function Lazy(props) {
    if (!Comp) Comp = load()[name]
    return <Comp {...props} />
  }
  Lazy.displayName = `Lazy(${name})`
  return Lazy
}

const React = require('react')
const { View } = require('react-native')

function call() {
  return Promise.resolve(undefined)
}

function leaf() {
  function fn() {
    return Promise.resolve(undefined)
  }
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === 'then' || prop === '$$typeof') return undefined
      if (prop === '__esModule') return true
      return leaf()
    },
    apply() {
      return Promise.resolve(undefined)
    },
  })
}

function view(name) {
  function Stub(props) {
    const { children, ...rest } = props || {}
    return React.createElement(View, rest, children)
  }
  Stub.displayName = name
  return Stub
}

/** Fallback module: known exports, plus a thenable for anything else. */
function softModule(named) {
  const base = { __esModule: true, ...named }
  if (base.default == null) base.default = base
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      return leaf()
    },
  })
}

module.exports = { call, leaf, softModule, view }

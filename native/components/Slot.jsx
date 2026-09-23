import { Component } from 'react'

/** One piece of the screen. A throw here hides that piece and leaves the rest up. */
export class Slot extends Component {
  constructor(props) {
    super(props)
    this.state = { dead: false }
  }

  static getDerivedStateFromError() {
    return { dead: true }
  }

  render() {
    if (this.state.dead) return this.props.fallback ?? null
    return this.props.children
  }
}

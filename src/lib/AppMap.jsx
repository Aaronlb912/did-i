import { goHash } from '../site/hash.js'

export const ROOMS = [
  { path: '/tonight', kicker: 'Tonight', title: 'The tap', body: 'One question. DID or nope.' },
  { path: '/later', kicker: 'Coming up', title: 'The next nights', body: 'What will be asked after tonight.' },
  { path: '/lamps', kicker: 'Questions', title: 'Your questions', body: 'Add, change, or stop asking.' },
  { path: '/ideas', kicker: 'What to ask', title: 'What belongs here', body: 'This is not a to-do list.' },
  { path: '/feed', kicker: 'Answers', title: 'Every tap', body: 'What you already hit.' },
  { path: '/week', kicker: 'Week', title: 'Seven nights', body: 'A row of nights.' },
  { path: '/streaks', kicker: 'In a row', title: 'Nights in a row', body: 'Which questions stayed on.' },
  { path: '/marks', kicker: 'Marks', title: 'What landed', body: 'The streak and the closed list.' },
  { path: '/kit', kicker: 'Collection', title: 'What you bought', body: 'Looks and cheers you bought.' },
  { path: '/stats', kicker: 'So far', title: 'Totals', body: 'Counts so far.' },
  { path: '/pings', kicker: 'Reminders', title: 'When it is due', body: 'This phone can tap you.' },
  { path: '/help', kicker: 'Help', title: 'How this works', body: 'The night, the data, the keys.' },
  { path: '/me', kicker: 'Tags', title: 'Your tags', body: 'Rename or drop a tag. Settings has this.' },
  { path: '/settings', kicker: 'Settings', title: 'This phone', body: 'Name, lock, a copy of the file.' },
]

export function AppMap({ except = [] }) {
  const rooms = ROOMS.filter((room) => !except.includes(room.path))
  return (
    <ul className="di-map">
      {rooms.map((room) => (
        <li key={room.path}>
          <button className="di-map-row" type="button" onClick={() => goHash(room.path)}>
            <span className="di-map-kicker">{room.kicker}</span>
            <span className="di-map-title">{room.title}</span>
            <span className="di-map-body">{room.body}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

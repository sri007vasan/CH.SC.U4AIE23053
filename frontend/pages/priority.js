import { useState, useEffect } from "react"

const W = { Placement: 3, Result: 2, Event: 1 }

export default function Priority({ tok }) {
  const [notifs, setNotifs] = useState([])
  const [n, setN] = useState(10)
  const [loading, setLoading] = useState(false)
  const [seen, setSeen] = useState({})

  useEffect(() => {
    let s = localStorage.getItem("seen")
    if (s) setSeen(JSON.parse(s))
  }, [])

  useEffect(() => {
    if (!tok) return
    load()
  }, [tok])

  async function load() {
    setLoading(true)
    try {
      let r = await fetch("/api/notifs", {
        headers: { "Authorization": `Bearer ${tok}` }
      })
      let d = await r.json()
      let all = d.notifications || []
      let sorted = all.sort((a, b) => {
        let wa = W[a.Type] || 0
        let wb = W[b.Type] || 0
        if (wa !== wb) return wb - wa
        return new Date(b.Timestamp) - new Date(a.Timestamp)
      })
      setNotifs(sorted)
    } catch (e) {
      console.log(e)
    }
    setLoading(false)
  }

  function markSeen(id) {
    let s = { ...seen, [id]: true }
    setSeen(s)
    localStorage.setItem("seen", JSON.stringify(s))
  }

  let top = notifs.slice(0, n)

  return (
    <div className="container">
      <h1>Priority Inbox</h1>

      <div className="filters">
        <label>Show top: </label>
        <select value={n} onChange={e => setN(Number(e.target.value))}>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
        </select>
      </div>

      {!tok && <p className="warn">paste your token in the top bar first</p>}
      {loading && <p>loading...</p>}

      <div className="list">
        {top.map((item, i) => (
          <div
            key={item.ID}
            className={`card ${seen[item.ID] ? "read" : "unread"}`}
            onClick={() => markSeen(item.ID)}
          >
            <div className="cardtop">
              <span className="rank">#{i + 1}</span>
              <span className={`badge ${item.Type.toLowerCase()}`}>{item.Type}</span>
              {!seen[item.ID] && <span className="newbadge">NEW</span>}
            </div>
            <p className="msg">{item.Message}</p>
            <p className="time">{item.Timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

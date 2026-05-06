import { useState, useEffect } from "react"
import { Log } from "@/utils/logger"

export default function Home({ tok }) {
  const [notifs, setNotifs] = useState([])
  const [filter, setFilter] = useState("")
  const [pg, setPg] = useState(1)
  const [loading, setLoading] = useState(false)
  const [seen, setSeen] = useState({})

  useEffect(() => {
    let s = localStorage.getItem("seen")
    if (s) setSeen(JSON.parse(s))
  }, [])

  useEffect(() => {
    if (!tok) return
    load()
  }, [tok, filter, pg])

  async function load() {
    setLoading(true)
    let url = `/api/notifs?page=${pg}&limit=10`
    if (filter) url += `&type=${filter}`
    try {
      let r = await fetch(url, {
        headers: { "Authorization": `Bearer ${tok}` }
      })
      let d = await r.json()
      setNotifs(d.notifications || [])
      Log("info", "page", `loaded ${d.notifications?.length || 0} notifications`, tok)
    } catch (e) {
      Log("error", "page", `failed to load notifications: ${e.message}`, tok)
    }
    setLoading(false)
  }

  function markSeen(id) {
    let s = { ...seen, [id]: true }
    setSeen(s)
    localStorage.setItem("seen", JSON.stringify(s))
  }

  return (
    <div className="container">
      <h1>All Notifications</h1>

      <div className="filters">
        <button onClick={() => setFilter("")} className={!filter ? "active" : ""}>All</button>
        <button onClick={() => setFilter("Event")} className={filter === "Event" ? "active" : ""}>Event</button>
        <button onClick={() => setFilter("Result")} className={filter === "Result" ? "active" : ""}>Result</button>
        <button onClick={() => setFilter("Placement")} className={filter === "Placement" ? "active" : ""}>Placement</button>
      </div>

      {!tok && <p className="warn">paste your token in the top bar first</p>}
      {loading && <p>loading...</p>}

      <div className="list">
        {notifs.map(n => (
          <div
            key={n.ID}
            className={`card ${seen[n.ID] ? "read" : "unread"}`}
            onClick={() => markSeen(n.ID)}
          >
            <div className="cardtop">
              <span className={`badge ${n.Type.toLowerCase()}`}>{n.Type}</span>
              {!seen[n.ID] && <span className="newbadge">NEW</span>}
            </div>
            <p className="msg">{n.Message}</p>
            <p className="time">{n.Timestamp}</p>
          </div>
        ))}
      </div>

      {notifs.length > 0 && (
        <div className="paging">
          <button disabled={pg <= 1} onClick={() => setPg(pg - 1)}>Prev</button>
          <span>Page {pg}</span>
          <button onClick={() => setPg(pg + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

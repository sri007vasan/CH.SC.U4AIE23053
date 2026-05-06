import "@/styles/globals.css"
import Link from "next/link"
import { useState } from "react"

export default function App({ Component, pageProps }) {
  const [tok, setTok] = useState("")
  return (
    <div>
      <nav className="nav">
        <div className="navleft">
          <Link href="/">All Notifs</Link>
          <Link href="/priority">Priority</Link>
        </div>
        <div className="navright">
          <input
            type="text"
            placeholder="paste token here"
            value={tok}
            onChange={e => setTok(e.target.value)}
            className="tokinput"
          />
        </div>
      </nav>
      <Component {...pageProps} tok={tok} />
    </div>
  )
}

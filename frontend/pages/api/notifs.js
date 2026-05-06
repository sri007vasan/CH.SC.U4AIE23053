export default async function handler(req, res) {
  let url = "http://20.207.122.201/evaluation-service/notifications"
  let q = req.query
  let params = []
  if (q.type) params.push(`notification_type=${q.type}`)
  if (q.page) params.push(`page=${q.page}`)
  if (q.limit) params.push(`limit=${q.limit}`)
  if (params.length) url += "?" + params.join("&")

  let tok = req.headers.authorization || ""

  try {
    let r = await fetch(url, {
      headers: { "Authorization": tok }
    })
    let data = await r.json()
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

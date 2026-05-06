const url = "http://20.207.122.201/evaluation-service/logs"

const stk = ["backend", "frontend"]
const lvl = ["debug", "info", "warn", "error", "fatal"]
const fe_pkgs = ["api","component","hook","page","state","style","auth","config","middleware","utils"]

export async function Log(level, pkg, message, tok) {
  if (!tok) return
  if (!lvl.includes(level) || !fe_pkgs.includes(pkg)) return

  const body = {
    stack: "frontend",
    level: level,
    package: pkg,
    message: message
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tok}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
  } catch (e) {
    // Ignore log errors
  }
}

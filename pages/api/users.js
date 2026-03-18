import { UsersTable, formatUser } from '../../lib/airtable'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const records = await UsersTable.select({ view: 'Grid view' }).all()
      const users = records.map(formatUser)
      return res.status(200).json(users)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const { name, username, pin, isAdmin, email } = req.body
    try {
      const record = await UsersTable.create({
        Name: name,
        Username: username,
        PIN: pin,
        IsAdmin: isAdmin || false,
        Email: email || '',
      })
      return res.status(200).json(formatUser(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}